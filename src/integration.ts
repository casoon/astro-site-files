import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  type AstroConfig,
  type AstroIntegration,
  type AstroLogger,
  type RouteData,
  PLUGIN,
  buildSiteWithBase,
  resolveSiteUrls,
} from './astro.js'
import { auditHumans, auditLlms, auditRobots, auditSecurity, reportIssues } from './audit.js'
import { writeSitemap } from './sitemap/build.js'
import { renderRssFeed } from './rss.js'
import type { SitemapOptions } from './sitemap/types.js'
import type { HumansOptions, LlmsOptions, LlmsSection, RobotsOptions, SiteFilesOptions } from './types.js'
import { renderRobotsTxt } from './robots.js'
import { renderLlmsTxt } from './llms.js'
import { renderSecurityTxt } from './security.js'
import { renderHumansTxt } from './humans.js'

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
        await writeRss(outDir, options, astroConfig, logger)
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
  // Deliberately not `resolveSiteUrls`: the `Sitemap:` line points at the file
  // on the origin robots.txt itself is served from, so Astro's `site` wins over
  // `sitemap.siteUrl`. The fallback only covers an unset `site` — a relative
  // Sitemap URL is not valid, so the alternative is no line at all.
  // See docs/guides/site-url-and-base.md.
  const sitemapOpts: SitemapOptions = typeof options.sitemap === 'object' ? options.sitemap : {}
  const robotsHost = astroConfig?.site ? String(astroConfig.site) : sitemapOpts.siteUrl
  const siteUrl = robotsHost ? buildSiteWithBase(robotsHost, astroConfig?.base) : undefined
  await writeFile(join(outDir, 'robots.txt'), renderRobotsTxt(robotsOpts, siteUrl, sitemapFilename), 'utf-8')
  logger.info('robots.txt generated')
  reportIssues(logger, auditRobots(robotsOpts), options.audit)
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
  reportIssues(logger, auditLlms(resolvedOpts), options.audit)
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
  reportIssues(logger, auditSecurity(options.security), options.audit)
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
  reportIssues(logger, auditHumans(humansOpts), options.audit)
}

async function writeRss(
  outDir: string,
  options: SiteFilesOptions,
  astroConfig: AstroConfig | undefined,
  logger: AstroLogger,
): Promise<void> {
  const sitemapOpts: SitemapOptions = typeof options.sitemap === 'object' ? options.sitemap : {}
  // `sitemap.rss` is the deprecated home for this — a feed is its own resource
  // and must keep working when the sitemap itself is switched off.
  const rss = options.rss ?? sitemapOpts.rss
  if (!rss) return

  const { siteUrl, effectiveSiteUrl } = resolveSiteUrls(sitemapOpts.siteUrl, astroConfig)

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
