import { fileURLToPath } from 'node:url'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import astroSitemap from '@casoon/astro-sitemap'
import type { SiteFilesOptions, RobotsOptions, HumansOptions } from './types.js'
import { renderRobotsTxt } from './robots.js'
import { renderLlmsTxt } from './llms.js'
import { renderSecurityTxt } from './security.js'
import { renderHumansTxt } from './humans.js'

interface AstroLogger {
  info(message: string): void
  warn(message: string): void
  error(message: string): void
}

interface AstroConfig {
  site?: string
}

interface AstroIntegration {
  name: string
  hooks: Record<string, unknown>
}

interface ConfigSetupHookParams {
  config: AstroConfig
  updateConfig: (newConfig: { integrations?: AstroIntegration[] }) => void
}

interface BuildDoneHookParams {
  dir: URL
  logger: AstroLogger
}

export default function siteFiles(options: SiteFilesOptions = {}): AstroIntegration {
  let siteUrl: string | undefined

  return {
    name: '@casoon/astro-site-files',
    hooks: {
      'astro:config:setup'({ config, updateConfig }: ConfigSetupHookParams) {
        siteUrl = config.site

        if (options.sitemap !== false) {
          const sitemapOpts =
            typeof options.sitemap === 'object' ? options.sitemap : {}
          updateConfig({ integrations: [astroSitemap(sitemapOpts) as AstroIntegration] })
        }
      },

      async 'astro:build:done'({ dir, logger }: BuildDoneHookParams) {
        const outDir = fileURLToPath(dir)

        await writeRobots(outDir, options, siteUrl, logger)
        await writeLlms(outDir, options, siteUrl, logger)
        await writeSecurity(outDir, options, logger)
        await writeHumans(outDir, options, logger)
      },
    },
  }
}

async function writeRobots(
  outDir: string,
  options: SiteFilesOptions,
  siteUrl: string | undefined,
  logger: AstroLogger,
): Promise<void> {
  if (options.robots === false) return
  const robotsOpts: RobotsOptions =
    typeof options.robots === 'object' ? options.robots : {}
  await writeFile(join(outDir, 'robots.txt'), renderRobotsTxt(robotsOpts, siteUrl), 'utf-8')
  logger.info('robots.txt generated')
}

async function writeLlms(
  outDir: string,
  options: SiteFilesOptions,
  _siteUrl: string | undefined,
  logger: AstroLogger,
): Promise<void> {
  if (!options.llms) return

  if (options.llms === true) {
    logger.warn('llms: requires a title — provide an object with { title } to generate llms.txt')
    return
  }

  await writeFile(join(outDir, 'llms.txt'), renderLlmsTxt(options.llms), 'utf-8')
  logger.info('llms.txt generated')
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
  await writeFile(
    join(wellKnownDir, 'security.txt'),
    renderSecurityTxt(options.security),
    'utf-8',
  )
  logger.info('.well-known/security.txt generated')
}

async function writeHumans(
  outDir: string,
  options: SiteFilesOptions,
  logger: AstroLogger,
): Promise<void> {
  if (!options.humans) return

  const humansOpts: HumansOptions =
    typeof options.humans === 'object' ? options.humans : {}
  await writeFile(join(outDir, 'humans.txt'), renderHumansTxt(humansOpts), 'utf-8')
  logger.info('humans.txt generated')
}
