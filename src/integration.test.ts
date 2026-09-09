import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import siteFiles from './integration.js'

interface TestLogger {
  info: string[]
  warn: string[]
  error: string[]
  logger: {
    info(message: string): void
    warn(message: string): void
    error(message: string): void
  }
}

function createLogger(): TestLogger {
  const messages = {
    info: [] as string[],
    warn: [] as string[],
    error: [] as string[],
  }
  return {
    ...messages,
    logger: {
      info: message => messages.info.push(message),
      warn: message => messages.warn.push(message),
      error: message => messages.error.push(message),
    },
  }
}

function getHook(integration: ReturnType<typeof siteFiles>, name: string) {
  return integration.hooks[name] as (args: unknown) => Promise<void> | void
}

describe('siteFiles integration', () => {
  it('uses Astro base when deriving the robots sitemap URL', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    const integration = siteFiles({ sitemap: false })

    getHook(integration, 'astro:config:setup')({
      config: { site: 'https://example.com', base: '/docs/' },
    })
    await getHook(integration, 'astro:build:done')({
      pages: [],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    const robots = await readFile(join(outDir, 'robots.txt'), 'utf-8')
    expect(robots).toContain('Sitemap: https://example.com/docs/sitemap.xml')
  })

  it('filters sitemap audit warnings and deduplicates serialized entries before writing', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    const integration = siteFiles({
      robots: false,
      audit: { disable: ['sitemap/duplicate-urls'] },
      sitemap: {
        sources: [
          async () => [
            { loc: '/first' },
            { loc: '/second' },
          ],
        ],
        serialize: entry => ({
          ...entry,
          loc: 'https://example.com/same',
        }),
      },
    })

    getHook(integration, 'astro:config:setup')({
      config: { site: 'https://example.com' },
    })
    await getHook(integration, 'astro:build:done')({
      pages: [],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    const sitemap = await readFile(join(outDir, 'sitemap.xml'), 'utf-8')
    expect(logger.warn.some(message => message.includes('duplicate URL'))).toBe(false)
    expect(sitemap.match(/<url>/g)).toHaveLength(1)
  })

  it('warns about duplicate URLs when source overrides a static page, but still writes one deduplicated entry', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    const integration = siteFiles({
      robots: false,
      sitemap: {
        sources: [
          async () => [
            { loc: '/blog/welcome/', lastmod: '2026-02-24' },
          ],
        ],
      },
    })

    getHook(integration, 'astro:config:setup')({
      config: { site: 'https://example.com' },
    })
    await getHook(integration, 'astro:build:done')({
      pages: [{ pathname: '/blog/welcome/' }],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    const sitemap = await readFile(join(outDir, 'sitemap.xml'), 'utf-8')
    // Audit runs before dedup, so the overlap is visible and warned about
    expect(logger.warn.some(message => message.includes('sitemap/duplicate-urls'))).toBe(true)
    // Output is still deduplicated — last wins (source entry with lastmod)
    expect(sitemap.match(/<url>/g)).toHaveLength(1)
    expect(sitemap).toContain('<lastmod>2026-02-24</lastmod>')
  })

  it('suppresses duplicate URL warning when sitemap/duplicate-urls is disabled', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    const integration = siteFiles({
      robots: false,
      audit: { disable: ['sitemap/duplicate-urls'] },
      sitemap: {
        sources: [
          async () => [
            { loc: '/blog/welcome/', lastmod: '2026-02-24' },
          ],
        ],
      },
    })

    getHook(integration, 'astro:config:setup')({
      config: { site: 'https://example.com' },
    })
    await getHook(integration, 'astro:build:done')({
      pages: [{ pathname: '/blog/welcome/' }],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    const sitemap = await readFile(join(outDir, 'sitemap.xml'), 'utf-8')
    expect(logger.warn.some(message => message.includes('sitemap/duplicate-urls'))).toBe(false)
    expect(sitemap.match(/<url>/g)).toHaveLength(1)
    expect(sitemap).toContain('<lastmod>2026-02-24</lastmod>')
  })
})

describe('sitemap built-in exclusions', () => {
  it('keeps content pages under /api/, /landing/ and /drafts/ in the sitemap', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    const integration = siteFiles({ robots: false })

    getHook(integration, 'astro:config:setup')({
      config: { site: 'https://example.com' },
    })
    await getHook(integration, 'astro:build:done')({
      pages: [
        { pathname: '/reference/api/authentication/' },
        { pathname: '/landing/spring/' },
        { pathname: '/drafts/notes/' },
      ],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    const sitemap = await readFile(join(outDir, 'sitemap.xml'), 'utf-8')
    expect(sitemap).toContain('https://example.com/reference/api/authentication/')
    expect(sitemap).toContain('https://example.com/landing/spring/')
    expect(sitemap).toContain('https://example.com/drafts/notes/')
  })

  it('still drops error pages and generated site files, and logs what it dropped', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    const integration = siteFiles({ robots: false })

    getHook(integration, 'astro:config:setup')({
      config: { site: 'https://example.com' },
    })
    await getHook(integration, 'astro:build:done')({
      pages: [
        { pathname: '/' },
        { pathname: '/404' },
        { pathname: '/_internal/thing/' },
        { pathname: '/robots.txt' },
      ],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    const sitemap = await readFile(join(outDir, 'sitemap.xml'), 'utf-8')
    expect(sitemap).toContain('https://example.com/')
    expect(sitemap).not.toContain('/404')
    expect(sitemap).not.toContain('/_internal/')
    expect(sitemap).not.toContain('/robots.txt')

    const skipLog = logger.info.find(m => m.includes('excluded by built-in rules'))
    expect(skipLog).toBeDefined()
    expect(skipLog).toContain('3 path(s)')
    expect(skipLog).toContain('/404')
  })

  it('logs meta-refresh redirect pages it drops', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    const integration = siteFiles({ robots: false })

    await mkdir(join(outDir, 'old-url'), { recursive: true })
    await writeFile(
      join(outDir, 'old-url', 'index.html'),
      '<meta http-equiv="refresh" content="0;url=/new-url/">',
      'utf-8',
    )

    getHook(integration, 'astro:config:setup')({
      config: { site: 'https://example.com' },
    })
    await getHook(integration, 'astro:build:done')({
      pages: [{ pathname: '/old-url/' }, { pathname: '/new-url/' }],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    const sitemap = await readFile(join(outDir, 'sitemap.xml'), 'utf-8')
    expect(sitemap).not.toContain('/old-url/')
    expect(sitemap).toContain('https://example.com/new-url/')

    const redirectLog = logger.info.find(m => m.includes('meta-refresh redirect'))
    expect(redirectLog).toBeDefined()
    expect(redirectLog).toContain('/old-url/')
  })

  it('lets a user filter re-include a path the old heuristics would have dropped', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    const integration = siteFiles({
      robots: false,
      sitemap: {
        filter: url => url.includes('/reference/api/'),
      },
    })

    getHook(integration, 'astro:config:setup')({
      config: { site: 'https://example.com' },
    })
    await getHook(integration, 'astro:build:done')({
      pages: [
        { pathname: '/reference/api/authentication/' },
        { pathname: '/about/' },
      ],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    const sitemap = await readFile(join(outDir, 'sitemap.xml'), 'utf-8')
    expect(sitemap).toContain('https://example.com/reference/api/authentication/')
    expect(sitemap).not.toContain('https://example.com/about/')
  })
})

describe('llms sources', () => {
  it('merges source sections after manual sections', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    const integration = siteFiles({
      robots: false,
      sitemap: false,
      llms: {
        title: 'My Site',
        sections: [{ title: 'Manual', links: [{ title: 'Home', url: '/' }] }],
        sources: [
          async () => ({ title: 'Blog', links: [{ title: 'Post 1', url: '/blog/1' }] }),
        ],
      },
    })

    getHook(integration, 'astro:config:setup')({ config: {} })
    await getHook(integration, 'astro:build:done')({
      pages: [],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    const llms = await readFile(join(outDir, 'llms.txt'), 'utf-8')
    expect(llms).toContain('## Manual')
    expect(llms).toContain('[Home](/)')
    expect(llms).toContain('## Blog')
    expect(llms).toContain('[Post 1](/blog/1)')
    expect(logger.info.some(m => m.includes('llms.txt generated'))).toBe(true)
  })

  it('does not emit llms/no-sections when only sources are configured', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    const integration = siteFiles({
      robots: false,
      sitemap: false,
      llms: {
        title: 'My Site',
        description: 'A site.',
        sources: [
          async () => ({ title: 'Blog', links: [{ title: 'Post 1', url: '/blog/1' }] }),
        ],
      },
    })

    getHook(integration, 'astro:config:setup')({ config: {} })
    await getHook(integration, 'astro:build:done')({
      pages: [],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    expect(logger.info.every(m => !m.includes('no-sections'))).toBe(true)
    const llms = await readFile(join(outDir, 'llms.txt'), 'utf-8')
    expect(llms).toContain('## Blog')
  })
})

describe('robots.txt / sitemap filename coupling', () => {
  it('references sitemap-index.xml in robots.txt when the index mode is used', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    const integration = siteFiles({ sitemap: { output: { mode: 'index' } } })

    getHook(integration, 'astro:config:setup')({ config: { site: 'https://example.com' } })
    await getHook(integration, 'astro:build:done')({
      pages: [{ pathname: '/' }],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    const robots = await readFile(join(outDir, 'robots.txt'), 'utf-8')
    expect(robots).toContain('Sitemap: https://example.com/sitemap-index.xml')
    await expect(readFile(join(outDir, 'sitemap-index.xml'), 'utf-8')).resolves.toBeTruthy()
  })

  it('references a custom sitemap filename in robots.txt', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    const integration = siteFiles({ sitemap: { output: { filename: 'my-sitemap.xml' } } })

    getHook(integration, 'astro:config:setup')({ config: { site: 'https://example.com' } })
    await getHook(integration, 'astro:build:done')({
      pages: [{ pathname: '/' }],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    const robots = await readFile(join(outDir, 'robots.txt'), 'utf-8')
    expect(robots).toContain('Sitemap: https://example.com/my-sitemap.xml')
  })

  it('falls back to sitemap.xml when sitemap generation is disabled', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    const integration = siteFiles({ sitemap: false })

    getHook(integration, 'astro:config:setup')({ config: { site: 'https://example.com' } })
    await getHook(integration, 'astro:build:done')({
      pages: [{ pathname: '/' }],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    const robots = await readFile(join(outDir, 'robots.txt'), 'utf-8')
    expect(robots).toContain('Sitemap: https://example.com/sitemap.xml')
  })
})

describe('error page exclusion', () => {
  it('drops real error pages but keeps content pages that merely start with 404/500', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    const integration = siteFiles({ robots: false })

    getHook(integration, 'astro:config:setup')({ config: { site: 'https://example.com' } })
    await getHook(integration, 'astro:build:done')({
      pages: [
        { pathname: '/blog/404-error-pages-guide/' },
        { pathname: '/blog/500-internal-errors/' },
        { pathname: '/404/' },
        { pathname: '/de/500/' },
      ],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    const sitemap = await readFile(join(outDir, 'sitemap.xml'), 'utf-8')
    expect(sitemap).toContain('https://example.com/blog/404-error-pages-guide/')
    expect(sitemap).toContain('https://example.com/blog/500-internal-errors/')
    expect(sitemap).not.toContain('https://example.com/404/')
    expect(sitemap).not.toContain('https://example.com/de/500/')
  })

  it('drops error pages built with build.format: file', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    const integration = siteFiles({ robots: false })

    getHook(integration, 'astro:config:setup')({
      config: { site: 'https://example.com', build: { format: 'file' } },
    })
    await getHook(integration, 'astro:build:done')({
      pages: [{ pathname: '/404' }, { pathname: '/about' }],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    const sitemap = await readFile(join(outDir, 'sitemap.xml'), 'utf-8')
    expect(sitemap).not.toContain('/404.html')
    expect(sitemap).toContain('https://example.com/about.html')
  })
})

describe('sitemap i18n', () => {
  it('adds an x-default link pointing at the default locale', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    const integration = siteFiles({
      robots: false,
      sitemap: { i18n: { defaultLocale: 'en', locales: { en: 'en-US', de: 'de-DE' } } },
    })

    getHook(integration, 'astro:config:setup')({ config: { site: 'https://example.com' } })
    await getHook(integration, 'astro:build:done')({
      pages: [{ pathname: '/about/' }, { pathname: '/de/about/' }],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    const sitemap = await readFile(join(outDir, 'sitemap.xml'), 'utf-8')
    expect(sitemap).toContain('hreflang="x-default" href="https://example.com/about/"')
    expect(sitemap).toContain('hreflang="de-DE" href="https://example.com/de/about/"')
  })

  it('does not add x-default to pages without translations', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    const integration = siteFiles({
      robots: false,
      sitemap: { i18n: { defaultLocale: 'en', locales: { en: 'en-US', de: 'de-DE' } } },
    })

    getHook(integration, 'astro:config:setup')({ config: { site: 'https://example.com' } })
    await getHook(integration, 'astro:build:done')({
      pages: [{ pathname: '/only-english/' }],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    const sitemap = await readFile(join(outDir, 'sitemap.xml'), 'utf-8')
    expect(sitemap).not.toContain('x-default')
  })
})

describe('noindex pages', () => {
  it('drops pages whose head carries meta robots noindex', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    await mkdir(join(outDir, 'thanks'), { recursive: true })
    await mkdir(join(outDir, 'about'), { recursive: true })
    await writeFile(
      join(outDir, 'thanks/index.html'),
      '<html><head><meta charset="utf-8"><meta name="robots" content="noindex, follow"></head><body>ok</body></html>',
    )
    await writeFile(join(outDir, 'about/index.html'), '<html><head></head><body>ok</body></html>')

    const integration = siteFiles({ robots: false })
    getHook(integration, 'astro:config:setup')({ config: { site: 'https://example.com' } })
    await getHook(integration, 'astro:build:done')({
      pages: [{ pathname: '/thanks/' }, { pathname: '/about/' }],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    const sitemap = await readFile(join(outDir, 'sitemap.xml'), 'utf-8')
    expect(sitemap).not.toContain('https://example.com/thanks/')
    expect(sitemap).toContain('https://example.com/about/')
  })

  it('keeps noindex pages when excludeNoindex is disabled', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    await mkdir(join(outDir, 'thanks'), { recursive: true })
    await writeFile(
      join(outDir, 'thanks/index.html'),
      '<html><head><meta name="robots" content="noindex"></head><body>ok</body></html>',
    )

    const integration = siteFiles({ robots: false, sitemap: { excludeNoindex: false } })
    getHook(integration, 'astro:config:setup')({ config: { site: 'https://example.com' } })
    await getHook(integration, 'astro:build:done')({
      pages: [{ pathname: '/thanks/' }],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    expect(await readFile(join(outDir, 'sitemap.xml'), 'utf-8')).toContain('https://example.com/thanks/')
  })

  it('ignores a noindex directive that only appears in the body', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    await mkdir(join(outDir, 'docs'), { recursive: true })
    await writeFile(
      join(outDir, 'docs/index.html'),
      '<html><head></head><body><code>&lt;meta name="robots" content="noindex"&gt;</code>'
      + '<meta name="robots" content="noindex"></body></html>',
    )

    const integration = siteFiles({ robots: false })
    getHook(integration, 'astro:config:setup')({ config: { site: 'https://example.com' } })
    await getHook(integration, 'astro:build:done')({
      pages: [{ pathname: '/docs/' }],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    expect(await readFile(join(outDir, 'sitemap.xml'), 'utf-8')).toContain('https://example.com/docs/')
  })
})

describe('page files on disk', () => {
  it('reads index.html when a pathname without a trailing slash maps to a directory', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    await mkdir(join(outDir, 'de/about'), { recursive: true })
    await writeFile(
      join(outDir, 'de/about/index.html'),
      '<html><head><script type="application/ld+json" data-sitemap-priority="0.95">{}</script></head></html>',
    )

    const integration = siteFiles({ robots: false })
    getHook(integration, 'astro:config:setup')({ config: { site: 'https://example.com' } })
    await getHook(integration, 'astro:build:done')({
      pages: [{ pathname: '/de/about' }],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    const sitemap = await readFile(join(outDir, 'sitemap.xml'), 'utf-8')
    expect(sitemap).toContain('https://example.com/de/about')
    expect(sitemap).toContain('<priority>0.95</priority>')
  })

  it('reads sitemap data-attributes from a later JSON-LD block', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    await mkdir(join(outDir, 'post'), { recursive: true })
    await writeFile(
      join(outDir, 'post/index.html'),
      '<html><head>'
      + '<script type="application/ld+json">{"@type":"Organization"}</script>'
      + '<script type="application/ld+json" data-sitemap-changefreq="daily" data-sitemap-priority="0.9">{"@type":"Article"}</script>'
      + '</head></html>',
    )

    const integration = siteFiles({ robots: false })
    getHook(integration, 'astro:config:setup')({ config: { site: 'https://example.com' } })
    await getHook(integration, 'astro:build:done')({
      pages: [{ pathname: '/post/' }],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    const sitemap = await readFile(join(outDir, 'sitemap.xml'), 'utf-8')
    expect(sitemap).toContain('<changefreq>daily</changefreq>')
    expect(sitemap).toContain('<priority>0.9</priority>')
  })
})

describe('i18n from the Astro config', () => {
  it('derives hreflang links from astroConfig.i18n', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    const integration = siteFiles({ robots: false })

    getHook(integration, 'astro:config:setup')({
      config: {
        site: 'https://example.com',
        i18n: { defaultLocale: 'en', locales: ['en', { path: 'de', codes: ['de-DE', 'de-AT'] }] },
      },
    })
    await getHook(integration, 'astro:build:done')({
      pages: [{ pathname: '/about/' }, { pathname: '/de/about/' }],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    const sitemap = await readFile(join(outDir, 'sitemap.xml'), 'utf-8')
    expect(sitemap).toContain('hreflang="de-DE" href="https://example.com/de/about/"')
    expect(sitemap).toContain('hreflang="x-default" href="https://example.com/about/"')
  })

  it('gives a locale home page the same priority as the default-locale home page', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    const integration = siteFiles({ robots: false })

    getHook(integration, 'astro:config:setup')({
      config: {
        site: 'https://example.com',
        i18n: { defaultLocale: 'en', locales: ['en', 'de'] },
      },
    })
    await getHook(integration, 'astro:build:done')({
      pages: [{ pathname: '/' }, { pathname: '/de/' }],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    const sitemap = await readFile(join(outDir, 'sitemap.xml'), 'utf-8')
    const german = sitemap.split('<url>').find(u => u.includes('https://example.com/de/'))
    expect(german).toContain('<priority>1.0</priority>')
    expect(german).toContain('<changefreq>weekly</changefreq>')
  })

  it('lets an explicit sitemap.i18n override the Astro config', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    const integration = siteFiles({
      robots: false,
      sitemap: { i18n: { defaultLocale: 'en', locales: { en: 'en', de: 'de-CH' } } },
    })

    getHook(integration, 'astro:config:setup')({
      config: {
        site: 'https://example.com',
        i18n: { defaultLocale: 'en', locales: ['en', { path: 'de', codes: ['de-DE'] }] },
      },
    })
    await getHook(integration, 'astro:build:done')({
      pages: [{ pathname: '/about/' }, { pathname: '/de/about/' }],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    expect(await readFile(join(outDir, 'sitemap.xml'), 'utf-8')).toContain('hreflang="de-CH"')
  })
})

describe('top-level rss option', () => {
  it('writes the feed even when the sitemap is disabled', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    const integration = siteFiles({
      robots: false,
      sitemap: false,
      rss: {
        title: 'Blog',
        description: 'Posts',
        getItems: () => [{ title: 'Hello', pubDate: new Date('2026-01-02'), link: '/blog/hello/' }],
      },
    })

    getHook(integration, 'astro:config:setup')({ config: { site: 'https://example.com' } })
    await getHook(integration, 'astro:build:done')({
      pages: [],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    const feed = await readFile(join(outDir, 'rss.xml'), 'utf-8')
    expect(feed).toContain('<link>https://example.com/blog/hello/</link>')
  })

  it('still honours the deprecated sitemap.rss placement', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    const integration = siteFiles({
      robots: false,
      sitemap: {
        rss: {
          title: 'Blog',
          description: 'Posts',
          getItems: () => [{ title: 'Hello', pubDate: new Date('2026-01-02'), link: '/blog/hello/' }],
        },
      },
    })

    getHook(integration, 'astro:config:setup')({ config: { site: 'https://example.com' } })
    await getHook(integration, 'astro:build:done')({
      pages: [{ pathname: '/' }],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })

    expect(await readFile(join(outDir, 'rss.xml'), 'utf-8')).toContain('<title><![CDATA[Hello]]></title>')
  })
})

describe('locale-agnostic priority/changefreq rules', () => {
  const astroI18n = { defaultLocale: 'en', locales: ['en', 'de'] }

  async function build(sitemap: Record<string, unknown>): Promise<string> {
    const outDir = await mkdtemp(join(tmpdir(), 'astro-site-files-'))
    const logger = createLogger()
    const integration = siteFiles({ robots: false, sitemap })
    getHook(integration, 'astro:config:setup')({
      config: { site: 'https://example.com', i18n: astroI18n },
    })
    await getHook(integration, 'astro:build:done')({
      pages: [{ pathname: '/blog/post/' }, { pathname: '/de/blog/post/' }],
      dir: pathToFileURL(`${outDir}/`),
      logger: logger.logger,
    })
    return readFile(join(outDir, 'sitemap.xml'), 'utf-8')
  }

  function entryFor(sitemap: string, loc: string): string {
    return sitemap.split('<url>').find(u => u.includes(`<loc>${loc}</loc>`))!
  }

  it('matches the real prefixed path by default', async () => {
    const xml = await build({ changefreq: [{ pattern: '/blog/', changefreq: 'hourly' }] })
    expect(entryFor(xml, 'https://example.com/blog/post/')).toContain('<changefreq>hourly</changefreq>')
    expect(entryFor(xml, 'https://example.com/de/blog/post/')).toContain('<changefreq>weekly</changefreq>')
  })

  it('applies every rule across locales when localeAgnosticRules is on', async () => {
    const xml = await build({
      localeAgnosticRules: true,
      changefreq: [{ pattern: '/blog/', changefreq: 'hourly' }],
      priority: [{ pattern: '/blog/', priority: 0.95 }],
    })
    for (const loc of ['https://example.com/blog/post/', 'https://example.com/de/blog/post/']) {
      expect(entryFor(xml, loc)).toContain('<changefreq>hourly</changefreq>')
      expect(entryFor(xml, loc)).toContain('<priority>0.95</priority>')
    }
  })

  it('lets a single rule opt in via allLocales', async () => {
    const xml = await build({ changefreq: [{ pattern: '/blog/', changefreq: 'hourly', allLocales: true }] })
    expect(entryFor(xml, 'https://example.com/de/blog/post/')).toContain('<changefreq>hourly</changefreq>')
  })

  it('lets a single rule opt out again to target one locale', async () => {
    const xml = await build({
      localeAgnosticRules: true,
      changefreq: [
        { pattern: '/de/blog/', changefreq: 'daily', allLocales: false },
        { pattern: '/blog/', changefreq: 'hourly' },
      ],
    })
    expect(entryFor(xml, 'https://example.com/de/blog/post/')).toContain('<changefreq>daily</changefreq>')
    expect(entryFor(xml, 'https://example.com/blog/post/')).toContain('<changefreq>hourly</changefreq>')
  })
})
