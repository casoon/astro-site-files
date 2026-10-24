import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  type AstroConfig,
  type AstroLogger,
  PLUGIN,
  i18nFromAstroConfig,
  resolveSiteUrls,
} from '../astro.js'
import { type AuditIssue, reportIssues } from '../audit.js'
import { READ_CONCURRENCY, mapLimit, readPageInfo } from '../page-scan.js'
import type { SiteFilesOptions } from '../types.js'
import { TODAY, deduplicateEntries, resolveEntry } from './compile.js'
import { buildI18nLinks } from './i18n.js'
import { renderSitemapIndex, renderSitemapXml } from './render.js'
import { auditSitemap } from './audit.js'
import type { ResolvedSitemapEntry, SitemapEntry, SitemapOptions } from './types.js'

// Only structurally unambiguous paths belong here: generated site files, error
// pages and Astro internals. Path segments that merely *look* non-content
// (`/api/`, `/landing/`, `/drafts/`) are left to the user's `exclude`/`filter`,
// because a docs or marketing site can serve real pages under them.
const BUILT_IN_SKIP: RegExp[] = [
  /^\/sitemap(-index)?\.xml$/,
  /^\/robots\.txt$/,
  /^\/llms\.txt$/,
  /^\/rss\.xml$/,
  /^\/feed\.xml$/,
  // Anchored: `/blog/404-error-pages-guide/` is a content page, not an error page.
  /\/(404|500)(\.html)?\/?$/,
  /^\/_/,
]

type SkipReason = 'built-in' | 'exclude' | 'filter'

function skipReason(
  urlPath: string,
  userExcludes: (string | RegExp)[],
  userFilter?: (url: string) => boolean,
  fullUrl?: string,
): SkipReason | undefined {
  if (BUILT_IN_SKIP.some(p => p.test(urlPath))) return 'built-in'
  if (userExcludes.some(p =>
    typeof p === 'string'
      ? urlPath === p || urlPath.startsWith(p)
      : p.test(urlPath),
  )) return 'exclude'
  if (userFilter && fullUrl && !userFilter(fullUrl)) return 'filter'
  return undefined
}

async function collectStaticEntries(
  outDir: string,
  pathnames: Set<string>,
  astroConfig: AstroConfig | undefined,
  sitemapOpts: SitemapOptions,
  effectiveSiteUrl: string,
  logger: AstroLogger,
): Promise<SitemapEntry[]> {
  const builtInSkipped: string[] = []
  const candidates: Array<{ urlPath: string; fullUrl: string }> = []

  for (const raw of pathnames) {
    let urlPath = raw === '' ? '/' : raw.startsWith('/') ? raw : `/${raw}`
    if (
      (astroConfig?.build?.format === 'file' || astroConfig?.build?.format === 'preserve') &&
      urlPath !== '/' &&
      !urlPath.endsWith('/')
    ) {
      urlPath = `${urlPath}.html`
    }
    const fullUrl = effectiveSiteUrl ? `${effectiveSiteUrl}${urlPath}` : urlPath
    const reason = skipReason(urlPath, sitemapOpts.exclude ?? [], sitemapOpts.filter, fullUrl)
    if (reason) {
      if (reason === 'built-in') builtInSkipped.push(urlPath)
      continue
    }
    candidates.push({ urlPath, fullUrl })
  }

  const infos = await mapLimit(candidates, READ_CONCURRENCY, c => readPageInfo(outDir, c.urlPath))

  const excludeNoindex = sitemapOpts.excludeNoindex !== false
  const entries: SitemapEntry[] = []
  const redirectSkipped: string[] = []
  const noindexSkipped: string[] = []
  for (const [i, candidate] of candidates.entries()) {
    const info = infos[i]!
    if (info.isRedirect) {
      redirectSkipped.push(candidate.urlPath)
      continue
    }
    if (info.noindex && excludeNoindex) {
      noindexSkipped.push(candidate.urlPath)
      continue
    }
    entries.push({
      loc: candidate.fullUrl,
      lastmod: info.lastmod,
      ...(info.changefreq ? { changefreq: info.changefreq } : {}),
      ...(info.priority !== undefined ? { priority: info.priority } : {}),
    })
  }

  logSkipped(builtInSkipped, 'excluded by built-in rules', logger)
  logSkipped(redirectSkipped, 'excluded as meta-refresh redirect pages', logger)
  logSkipped(noindexSkipped, 'excluded because of <meta name="robots" content="noindex">', logger)
  return entries
}

function logSkipped(skipped: string[], label: string, logger: AstroLogger): void {
  if (skipped.length === 0) return
  const shown = skipped.slice(0, 10).join(', ')
  const rest = skipped.length - 10
  logger.info(
    `sitemap: ${skipped.length} path(s) ${label}: ${shown}`
    + (rest > 0 ? `, and ${rest} more` : ''),
  )
}

async function applySerialize(
  entries: ResolvedSitemapEntry[],
  serialize: SitemapOptions['serialize'],
): Promise<ResolvedSitemapEntry[]> {
  if (!serialize) return entries
  const serialized: ResolvedSitemapEntry[] = []
  for (const entry of entries) {
    const result = await serialize(entry)
    if (result !== undefined) serialized.push(result)
  }
  return deduplicateEntries(serialized)
}

async function writeSitemapOutput(
  outDir: string,
  entries: ResolvedSitemapEntry[],
  sitemapOpts: SitemapOptions,
  effectiveSiteUrl: string,
  logger: AstroLogger,
): Promise<string> {
  await mkdir(outDir, { recursive: true })
  const maxUrls = sitemapOpts.output?.maxUrls ?? 50_000
  const filename = sitemapOpts.output?.filename ?? 'sitemap.xml'
  const useIndex = sitemapOpts.output?.mode === 'index' || entries.length > maxUrls

  if (!useIndex) {
    const xml = renderSitemapXml(entries, `Generated by ${PLUGIN}`)
    await writeFile(join(outDir, filename), xml, 'utf-8')
    logger.info(`${filename} generated (${entries.length} URLs)`)
    return filename
  }

  const chunks: ResolvedSitemapEntry[][] = []
  for (let i = 0; i < entries.length; i += maxUrls) {
    chunks.push(entries.slice(i, i + maxUrls))
  }
  const indexEntries: Array<{ loc: string; lastmod: string }> = []
  for (let i = 0; i < chunks.length; i++) {
    const chunkFile = `sitemap-${i + 1}.xml`
    const xml = renderSitemapXml(chunks[i]!, `Part ${i + 1}/${chunks.length} — Generated by ${PLUGIN}`)
    await writeFile(join(outDir, chunkFile), xml, 'utf-8')
    indexEntries.push({
      loc: effectiveSiteUrl ? `${effectiveSiteUrl}/${chunkFile}` : `/${chunkFile}`,
      lastmod: TODAY,
    })
  }
  const indexXml = renderSitemapIndex(indexEntries)
  await writeFile(join(outDir, 'sitemap-index.xml'), indexXml, 'utf-8')
  logger.info(`sitemap-index.xml generated (${chunks.length} parts, ${entries.length} total URLs)`)
  return 'sitemap-index.xml'
}

export async function writeSitemap(
  outDir: string,
  options: SiteFilesOptions,
  astroConfig: AstroConfig | undefined,
  pages: Array<{ pathname: string }>,
  fallbackPathnames: string[],
  logger: AstroLogger,
): Promise<string> {
  const configured: SitemapOptions = typeof options.sitemap === 'object' ? options.sitemap : {}
  const sitemapOpts: SitemapOptions = {
    ...configured,
    i18n: configured.i18n ?? i18nFromAstroConfig(astroConfig),
  }

  const { siteUrl, effectiveSiteUrl } = resolveSiteUrls(sitemapOpts.siteUrl, astroConfig)

  const allPathnames = new Set([
    ...pages.filter(p => p?.pathname != null).map(p => p.pathname),
    ...fallbackPathnames,
  ])

  const staticEntries = await collectStaticEntries(
    outDir,
    allPathnames,
    astroConfig,
    sitemapOpts,
    effectiveSiteUrl,
    logger,
  )
  const sourceEntries: SitemapEntry[] = []
  for (const source of sitemapOpts.sources ?? []) {
    sourceEntries.push(...await source())
  }

  const resolved: ResolvedSitemapEntry[] = [...staticEntries, ...sourceEntries].map(e =>
    resolveEntry(e, sitemapOpts, effectiveSiteUrl),
  )
  const issues: AuditIssue[] = auditSitemap(resolved, sitemapOpts, siteUrl)

  let entries = deduplicateEntries(resolved)
  entries = await applySerialize(entries, sitemapOpts.serialize)

  if (sitemapOpts.i18n && effectiveSiteUrl) {
    entries = buildI18nLinks(entries, sitemapOpts.i18n, effectiveSiteUrl)
  }

  reportIssues(logger, issues, options.audit)

  return writeSitemapOutput(outDir, entries, sitemapOpts, effectiveSiteUrl, logger)
}
