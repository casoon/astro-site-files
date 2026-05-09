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
      audit: { disable: ['DUPLICATE_URLS'] },
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

  it('does not warn when source entries override generated page entries', async () => {
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
    expect(logger.warn.some(message => message.includes('duplicate URL'))).toBe(false)
    expect(sitemap.match(/<url>/g)).toHaveLength(1)
    expect(sitemap).toContain('<lastmod>2026-02-24</lastmod>')
  })
})
