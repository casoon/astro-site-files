import { mkdir, open, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deduplicateEntries, resolveEntry } from './sitemap/compile.js'
import { renderSitemapIndex, renderSitemapXml } from './sitemap/render.js'
import { auditSitemap } from './sitemap/audit.js'
import { renderRssFeed } from './rss.js'
import type {
  Changefreq,
  HreflangLink,
  I18nOptions,
  ResolvedSitemapEntry,
  SitemapEntry,
  SitemapOptions,
} from './sitemap/types.js'
import type { HumansOptions, LlmsOptions, LlmsSection, RobotsOptions, SiteFilesOptions } from './types.js'
import { renderRobotsTxt } from './robots.js'
import { renderLlmsTxt } from './llms.js'
import { renderSecurityTxt } from './security.js'
import { renderHumansTxt } from './humans.js'
import { type AuditIssue, auditHumans, auditLlms, auditRobots, auditSecurity, filterIssues } from './audit.js'

const TODAY = new Date().toISOString().split('T')[0]!
const PLUGIN = '@casoon/astro-site-files'

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

// ── Astro hook interfaces ─────────────────────────────────────────────────────

interface AstroLogger {
  info(message: string): void
  warn(message: string): void
  error(message: string): void
}

interface AstroConfig {
  site?: string
  base?: string
  build?: { format?: 'file' | 'directory' | 'preserve' }
}

interface AstroIntegration {
  name: string
  hooks: Record<string, unknown>
}

interface RouteData {
  pathname?: string
  type: string
  fallbackRoutes: RouteData[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSiteWithBase(siteUrl: string | undefined, base: string | undefined): string {
  const normalizedBase = (!base || base === '/') ? '' : '/' + base.replace(/^\/|\/$/g, '')
  return (siteUrl?.replace(/\/$/, '') ?? '') + normalizedBase
}

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

function buildI18nLinks(
  entries: ResolvedSitemapEntry[],
  i18n: I18nOptions,
  siteUrl: string,
): ResolvedSitemapEntry[] {
  const { defaultLocale, locales } = i18n
  const localeKeys = Object.keys(locales)
  const base = siteUrl.replace(/\/$/, '')

  function getCanonicalInfo(fullUrl: string): { canonical: string; locale: string } {
    const path = fullUrl.startsWith(base) ? fullUrl.slice(base.length) : fullUrl
    const normalized = path.startsWith('/') ? path : `/${path}`
    for (const locale of localeKeys) {
      const prefix = `/${locale}`
      if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
        return { canonical: normalized.slice(prefix.length) || '/', locale }
      }
    }
    return { canonical: normalized, locale: defaultLocale }
  }

  const groups = new Map<string, Array<{ locale: string; entry: ResolvedSitemapEntry }>>()
  for (const entry of entries) {
    const { canonical, locale } = getCanonicalInfo(entry.loc)
    if (!groups.has(canonical)) groups.set(canonical, [])
    groups.get(canonical)!.push({ locale, entry })
  }

  return entries.map(entry => {
    const { canonical } = getCanonicalInfo(entry.loc)
    const group = groups.get(canonical) ?? []
    if (group.length <= 1) return entry
    const links: HreflangLink[] = group.map(({ locale, entry: e }) => ({
      hreflang: locales[locale] ?? locale,
      href: e.loc,
    }))
    // x-default tells search engines which variant to serve for unmatched locales.
    const fallback = group.find(g => g.locale === defaultLocale)
    if (fallback) links.push({ hreflang: 'x-default', href: fallback.entry.loc })
    return { ...entry, links }
  })
}

function pageFilePath(outDir: string, urlPath: string): string {
  return urlPath === '/' || urlPath.endsWith('/')
    ? join(outDir, urlPath, 'index.html')
    : join(outDir, urlPath)
}

interface PageInfo {
  lastmod?: string
  isRedirect: boolean
  changefreq?: Changefreq
  priority?: number
}

/** One open() per page — mtime, redirect detection and metadata all come from it. */
async function readPageInfo(outDir: string, urlPath: string): Promise<PageInfo> {
  const fh = await open(pageFilePath(outDir, urlPath), 'r').catch(() => null)
  if (!fh) return { isRedirect: false }
  try {
    const [stats, content] = await Promise.all([fh.stat(), fh.readFile('utf-8')])
    const lastmod = stats.mtime.toISOString().split('T')[0]
    if (content.slice(0, 512).toLowerCase().includes('<meta http-equiv="refresh"')) {
      return { lastmod, isRedirect: true }
    }
    return { lastmod, isRedirect: false, ...parseHtmlMetadata(content) }
  } finally {
    await fh.close()
  }
}

const VALID_CHANGEFREQS = new Set<string>(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'])

function parseHtmlMetadata(content: string): { changefreq?: Changefreq; priority?: number } {
  // Capture the full opening tag of a JSON-LD script to find data-sitemap-* attributes
  // regardless of attribute order
  const jsonLdMatch = /<script\s+([^>]*type=["']application\/ld\+json["'][^>]*)>/i.exec(content)
  if (!jsonLdMatch) return {}

  const attrs = jsonLdMatch[1]!
  const changefreqMatch = /data-sitemap-changefreq=["'](.*?)["']/i.exec(attrs)
  const priorityMatch = /data-sitemap-priority=["'](.*?)["']/i.exec(attrs)

  const res: { changefreq?: Changefreq; priority?: number } = {}
  if (changefreqMatch) {
    const val = changefreqMatch[1]!.toLowerCase()
    if (VALID_CHANGEFREQS.has(val)) res.changefreq = val as Changefreq
  }
  if (priorityMatch) {
    const val = parseFloat(priorityMatch[1]!)
    if (!isNaN(val)) res.priority = val
  }
  return res
}

const READ_CONCURRENCY = 16

/** Bounded-concurrency map that preserves input order. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index]!)
    }
  })
  await Promise.all(workers)
  return results
}


// ── Integration ───────────────────────────────────────────────────────────────

export default function siteFiles(options: SiteFilesOptions = {}): AstroIntegration {
  let astroConfig: AstroConfig | undefined
  let fallbackPathnames: string[] = []

  return {
    name: PLUGIN,
    hooks: {
      'astro:config:setup'({ config }: { config: AstroConfig }) {
        astroConfig = config
      },

      'astro:routes:resolved'({ routes }: { routes: RouteData[] }) {
        if (options.sitemap === false) return
        fallbackPathnames = routes
          .filter(r => r.type === 'page' && r.fallbackRoutes?.length > 0)
          .flatMap(r => r.fallbackRoutes)
          .filter(fr => fr.pathname != null)
          .map(fr => fr.pathname!)
      },

      async 'astro:build:done'({
        pages,
        dir,
        logger,
      }: {
        pages: Array<{ pathname: string }>
        dir: URL
        logger: AstroLogger
      }) {
        const outDir = fileURLToPath(dir)

        // Sitemap first: robots.txt has to reference the file that was actually
        // written, which in index mode is `sitemap-index.xml`, not `sitemap.xml`.
        const sitemapFilename = options.sitemap !== false
          ? await writeSitemap(outDir, options, astroConfig, pages, fallbackPathnames, logger)
          : undefined

        await writeRobots(outDir, options, astroConfig, logger, sitemapFilename)
        await writeLlms(outDir, options, logger)
        await writeSecurity(outDir, options, logger)
        await writeHumans(outDir, options, logger)
      },
    },
  }
}

// ── File writers ──────────────────────────────────────────────────────────────

async function writeRobots(
  outDir: string,
  options: SiteFilesOptions,
  astroConfig: AstroConfig | undefined,
  logger: AstroLogger,
  sitemapFilename: string | undefined,
): Promise<void> {
  if (options.robots === false) return
  const robotsOpts: RobotsOptions = typeof options.robots === 'object' ? options.robots : {}
  const siteUrl = astroConfig?.site ? buildSiteWithBase(String(astroConfig.site), astroConfig.base) : undefined
  await writeFile(join(outDir, 'robots.txt'), renderRobotsTxt(robotsOpts, siteUrl, sitemapFilename), 'utf-8')
  logger.info('robots.txt generated')
  for (const issue of filterIssues(auditRobots(robotsOpts), options.audit)) {
    logger[issue.level](`[${issue.rule}] ${issue.message} — ${issue.help}`)
  }
}

async function writeLlms(
  outDir: string,
  options: SiteFilesOptions,
  logger: AstroLogger,
): Promise<void> {
  if (!options.llms) return
  if (options.llms === true) {
    logger.warn('llms: requires a title — provide an object with { title } to generate llms.txt')
    return
  }
  const llmsOpts: LlmsOptions = options.llms
  const sourceSections: LlmsSection[] = []
  for (const source of llmsOpts.sources ?? []) {
    sourceSections.push(await source())
  }
  const resolvedOpts: LlmsOptions = sourceSections.length
    ? { ...llmsOpts, sections: [...(llmsOpts.sections ?? []), ...sourceSections] }
    : llmsOpts
  await writeFile(join(outDir, 'llms.txt'), renderLlmsTxt(resolvedOpts), 'utf-8')
  logger.info('llms.txt generated')
  for (const issue of filterIssues(auditLlms(resolvedOpts), options.audit)) {
    logger[issue.level](`[${issue.rule}] ${issue.message} — ${issue.help}`)
  }
}

async function writeSecurity(
  outDir: string,
  options: SiteFilesOptions,
  logger: AstroLogger,
): Promise<void> {
  if (!options.security) return
  if (options.security === true || !options.security.contact) {
    logger.warn('security: requires a contact field (RFC 9116) — skipping security.txt')
    return
  }
  const wellKnownDir = join(outDir, '.well-known')
  await mkdir(wellKnownDir, { recursive: true })
  await writeFile(join(wellKnownDir, 'security.txt'), renderSecurityTxt(options.security), 'utf-8')
  logger.info('.well-known/security.txt generated')
  for (const issue of filterIssues(auditSecurity(options.security), options.audit)) {
    logger[issue.level](`[${issue.rule}] ${issue.message} — ${issue.help}`)
  }
}

async function writeHumans(
  outDir: string,
  options: SiteFilesOptions,
  logger: AstroLogger,
): Promise<void> {
  if (!options.humans) return
  const humansOpts: HumansOptions = typeof options.humans === 'object' ? options.humans : {}
  await writeFile(join(outDir, 'humans.txt'), renderHumansTxt(humansOpts), 'utf-8')
  logger.info('humans.txt generated')
  for (const issue of filterIssues(auditHumans(humansOpts), options.audit)) {
    logger[issue.level](`[${issue.rule}] ${issue.message} — ${issue.help}`)
  }
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

  const entries: SitemapEntry[] = []
  const redirectSkipped: string[] = []
  for (const [i, candidate] of candidates.entries()) {
    const info = infos[i]!
    if (info.isRedirect) {
      redirectSkipped.push(candidate.urlPath)
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

async function writeSitemapRss(
  outDir: string,
  rss: NonNullable<SitemapOptions['rss']>,
  effectiveSiteUrl: string,
  siteUrl: string | undefined,
  logger: AstroLogger,
): Promise<void> {
  const rssFilename = rss.filename ?? 'rss.xml'
  const rssSiteUrl = effectiveSiteUrl || siteUrl || ''
  const rssItems = await rss.getItems(rssSiteUrl)
  const rssXml = renderRssFeed({
    title: rss.title,
    description: rss.description,
    feedUrl: rss.feedUrl ?? `${rssSiteUrl}/${rssFilename}`,
    language: rss.language,
    copyright: rss.copyright,
    managingEditor: rss.managingEditor,
    feedCustomData: rss.feedCustomData,
    xmlns: rss.xmlns,
  }, rssSiteUrl, rssItems)
  await writeFile(join(outDir, rssFilename), rssXml, 'utf-8')
  logger.info(`${rssFilename} generated (${rssItems.length} items)`)
}

async function writeSitemap(
  outDir: string,
  options: SiteFilesOptions,
  astroConfig: AstroConfig | undefined,
  pages: Array<{ pathname: string }>,
  fallbackPathnames: string[],
  logger: AstroLogger,
): Promise<string> {
  const sitemapOpts: SitemapOptions = typeof options.sitemap === 'object' ? options.sitemap : {}

  const siteUrl = (
    sitemapOpts.siteUrl ?? (astroConfig?.site ? String(astroConfig.site) : undefined)
  )?.replace(/\/$/, '')
  const effectiveSiteUrl = buildSiteWithBase(siteUrl, astroConfig?.base)

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

  for (const issue of filterIssues(issues, options.audit)) {
    logger[issue.level](`[${issue.rule}] ${issue.message} — ${issue.help}`)
  }

  const sitemapFilename = await writeSitemapOutput(outDir, entries, sitemapOpts, effectiveSiteUrl, logger)

  if (sitemapOpts.rss) {
    await writeSitemapRss(outDir, sitemapOpts.rss, effectiveSiteUrl, siteUrl, logger)
  }

  return sitemapFilename
}
