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

