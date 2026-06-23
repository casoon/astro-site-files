import { mkdir, open, readFile, stat, writeFile } from 'node:fs/promises'
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

const BUILT_IN_SKIP: RegExp[] = [
  /^\/sitemap(-index)?\.xml$/,
  /^\/robots\.txt$/,
  /^\/llms\.txt$/,
  /^\/rss\.xml$/,
  /^\/feed\.xml$/,
  /\/404\b/,
  /\/500\b/,
  /^\/_/,
  /\/api\//,
  /\/landing\//,
  /\/drafts\//,
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

function shouldSkip(
  urlPath: string,
  userExcludes: (string | RegExp)[],
  userFilter?: (url: string) => boolean,
  fullUrl?: string,
): boolean {
  if (BUILT_IN_SKIP.some(p => p.test(urlPath))) return true
  if (userExcludes.some(p =>
    typeof p === 'string'
      ? urlPath === p || urlPath.startsWith(p)
      : p.test(urlPath),
  )) return true
  if (userFilter && fullUrl && !userFilter(fullUrl)) return true
  return false
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
    return { ...entry, links }
  })
}

async function fileInfo(outDir: string, urlPath: string): Promise<{ lastmod?: string; isRedirect: boolean }> {
  const filePath = urlPath === '/' || urlPath.endsWith('/')
    ? join(outDir, urlPath, 'index.html')
    : join(outDir, urlPath)
  const s = await stat(filePath).catch(() => null)
  if (!s) return { isRedirect: false }
  const lastmod = s.mtime.toISOString().split('T')[0]

  // Read the first 512 bytes to detect meta-refresh redirect pages
  const fh = await open(filePath, 'r').catch(() => null)
  if (!fh) return { lastmod, isRedirect: false }
  try {
    const buf = Buffer.alloc(512)
    const { bytesRead } = await fh.read(buf, 0, 512, 0)
    const head = buf.toString('utf8', 0, bytesRead).toLowerCase()
    const isRedirect = head.includes('<meta http-equiv="refresh"')
    return { lastmod, isRedirect }
  } finally {
    await fh.close()
  }
}

const VALID_CHANGEFREQS = new Set<string>(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'])

async function readHtmlMetadata(filePath: string): Promise<{ changefreq?: Changefreq; priority?: number }> {
  const content = await readFile(filePath, 'utf-8').catch(() => '')
  if (!content) return {}

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

        await writeRobots(outDir, options, astroConfig, logger)
        await writeLlms(outDir, options, logger)
        await writeSecurity(outDir, options, logger)
        await writeHumans(outDir, options, logger)

        if (options.sitemap !== false) {
          await writeSitemap(outDir, options, astroConfig, pages, fallbackPathnames, logger)
        }
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
): Promise<void> {
  if (options.robots === false) return
  const robotsOpts: RobotsOptions = typeof options.robots === 'object' ? options.robots : {}
  const siteUrl = astroConfig?.site ? buildSiteWithBase(String(astroConfig.site), astroConfig.base) : undefined
  await writeFile(join(outDir, 'robots.txt'), renderRobotsTxt(robotsOpts, siteUrl), 'utf-8')
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
): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = []
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
    if (shouldSkip(urlPath, sitemapOpts.exclude ?? [], sitemapOpts.filter, fullUrl)) continue
    const { lastmod, isRedirect } = await fileInfo(outDir, urlPath)
    if (isRedirect) continue
    const filePath = urlPath === '/' || urlPath.endsWith('/')
      ? join(outDir, urlPath, 'index.html')
      : join(outDir, urlPath)
    const htmlMeta = await readHtmlMetadata(filePath)
    entries.push({
      loc: fullUrl,
      lastmod,
      ...(htmlMeta.changefreq ? { changefreq: htmlMeta.changefreq } : {}),
      ...(htmlMeta.priority !== undefined ? { priority: htmlMeta.priority } : {}),
    })
  }
  return entries
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
): Promise<void> {
  await mkdir(outDir, { recursive: true })
  const maxUrls = sitemapOpts.output?.maxUrls ?? 50_000
  const filename = sitemapOpts.output?.filename ?? 'sitemap.xml'
  const useIndex = sitemapOpts.output?.mode === 'index' || entries.length > maxUrls

  if (!useIndex) {
    const xml = renderSitemapXml(entries, `Generated by ${PLUGIN}`)
    await writeFile(join(outDir, filename), xml, 'utf-8')
    logger.info(`sitemap.xml generated (${entries.length} URLs)`)
    return
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
): Promise<void> {
  const sitemapOpts: SitemapOptions = typeof options.sitemap === 'object' ? options.sitemap : {}

  const siteUrl = (
    sitemapOpts.siteUrl ?? (astroConfig?.site ? String(astroConfig.site) : undefined)
  )?.replace(/\/$/, '')
  const effectiveSiteUrl = buildSiteWithBase(siteUrl, astroConfig?.base)

  const allPathnames = new Set([
    ...pages.filter(p => p?.pathname != null).map(p => p.pathname),
    ...fallbackPathnames,
  ])

  const staticEntries = await collectStaticEntries(outDir, allPathnames, astroConfig, sitemapOpts, effectiveSiteUrl)
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
    logger[issue.level]?.(`[${issue.rule}] ${issue.message} — ${issue.help}`)
  }

  await writeSitemapOutput(outDir, entries, sitemapOpts, effectiveSiteUrl, logger)

  if (sitemapOpts.rss) {
    await writeSitemapRss(outDir, sitemapOpts.rss, effectiveSiteUrl, siteUrl, logger)
  }
}
