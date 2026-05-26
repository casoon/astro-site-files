import { mkdtemp, readFile } from 'node:fs/promises'
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
