import { mkdir, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deduplicateEntries, resolveEntry } from './sitemap/compile.js'
import { renderSitemapIndex, renderSitemapXml } from './sitemap/render.js'
import { auditSitemap } from './sitemap/audit.js'
import type {
  AuditIssue,
  HreflangLink,
  I18nOptions,
  ResolvedSitemapEntry,
  SitemapEntry,
  SitemapOptions,
} from './sitemap/types.js'
import type { HumansOptions, RobotsOptions, SiteFilesOptions } from './types.js'
import { renderRobotsTxt } from './robots.js'
import { renderLlmsTxt } from './llms.js'
import { renderSecurityTxt } from './security.js'
import { renderHumansTxt } from './humans.js'
import { auditHumans, auditLlms, auditRobots, auditSecurity, filterIssues } from './audit.js'

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

async function fileLastmod(outDir: string, urlPath: string): Promise<string | undefined> {
  const filePath = urlPath === '/' || urlPath.endsWith('/')
    ? join(outDir, urlPath, 'index.html')
    : join(outDir, urlPath)
  const s = await stat(filePath).catch(() => null)
  return s ? s.mtime.toISOString().split('T')[0] : undefined
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

        await writeRobots(outDir, options, astroConfig?.site, logger)
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
  siteUrl: string | undefined,
  logger: AstroLogger,
): Promise<void> {
  if (options.robots === false) return
  const robotsOpts: RobotsOptions = typeof options.robots === 'object' ? options.robots : {}
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
  await writeFile(join(outDir, 'llms.txt'), renderLlmsTxt(options.llms), 'utf-8')
  logger.info('llms.txt generated')
  for (const issue of filterIssues(auditLlms(options.llms), options.audit)) {
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

  // ── Collect static pages ──────────────────────────────────────────────────
  const allPathnames = new Set([
    ...pages.filter(p => p?.pathname != null).map(p => p.pathname),
    ...fallbackPathnames,
  ])

  const staticEntries: SitemapEntry[] = []
  for (const raw of allPathnames) {
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
    const lastmod = await fileLastmod(outDir, urlPath)
    staticEntries.push({ loc: fullUrl, lastmod })
  }

  // ── Collect dynamic sources ───────────────────────────────────────────────
  const sourceEntries: SitemapEntry[] = []
  for (const source of sitemapOpts.sources ?? []) {
    sourceEntries.push(...await source())
  }

  // ── Resolve, deduplicate, serialize ──────────────────────────────────────
  const allRaw: SitemapEntry[] = [...staticEntries, ...sourceEntries]
  const resolved: ResolvedSitemapEntry[] = allRaw.map(e =>
    resolveEntry(e, sitemapOpts, effectiveSiteUrl),
  )
  let entries = deduplicateEntries(resolved)

  if (sitemapOpts.serialize) {
    const serialized: ResolvedSitemapEntry[] = []
    for (const entry of entries) {
      const result = await sitemapOpts.serialize(entry)
      if (result !== undefined) serialized.push(result)
    }
    entries = serialized
  }

  // ── i18n hreflang ─────────────────────────────────────────────────────────
  if (sitemapOpts.i18n && effectiveSiteUrl) {
    entries = buildI18nLinks(entries, sitemapOpts.i18n, effectiveSiteUrl)
  }

  // ── Audit ─────────────────────────────────────────────────────────────────
  const issues: AuditIssue[] = auditSitemap(resolved, sitemapOpts, siteUrl)
  for (const issue of issues) {
    logger[issue.level]?.(issue.message)
  }

  // ── Write output ──────────────────────────────────────────────────────────
  await mkdir(outDir, { recursive: true })

  const maxUrls = sitemapOpts.output?.maxUrls ?? 50_000
  const filename = sitemapOpts.output?.filename ?? 'sitemap.xml'
  const useIndex = sitemapOpts.output?.mode === 'index' || entries.length > maxUrls

  if (!useIndex) {
    const xml = renderSitemapXml(entries, `Generated by ${PLUGIN}`)
    await writeFile(join(outDir, filename), xml, 'utf-8')
    logger.info(`sitemap.xml generated (${entries.length} URLs)`)
  } else {
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
}
