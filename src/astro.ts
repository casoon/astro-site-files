import type { I18nOptions } from './sitemap/types.js'

export const PLUGIN = '@casoon/astro-site-files'

// ── Astro hook interfaces ─────────────────────────────────────────────────────

export interface AstroLogger {
  info(message: string): void
  warn(message: string): void
  error(message: string): void
}

export interface AstroI18nLocale {
  path: string
  codes: string[]
}

export interface AstroConfig {
  site?: string
  base?: string
  build?: { format?: 'file' | 'directory' | 'preserve' }
  i18n?: {
    defaultLocale: string
    locales: Array<string | AstroI18nLocale>
  }
}

export interface AstroIntegration {
  name: string
  hooks: Record<string, unknown>
}

export interface RouteData {
  pathname?: string
  type: string
  fallbackRoutes: RouteData[]
}

// ── Config helpers ────────────────────────────────────────────────────────────

/**
 * Astro already knows the locales — reusing them saves duplicating the whole
 * mapping under `sitemap.i18n`. An explicit `sitemap.i18n` still wins.
 */
export function i18nFromAstroConfig(astroConfig: AstroConfig | undefined): I18nOptions | undefined {
  const i18n = astroConfig?.i18n
  if (!i18n?.locales?.length) return undefined
  const locales: Record<string, string> = {}
  for (const locale of i18n.locales) {
    if (typeof locale === 'string') locales[locale] = locale
    else if (locale.path && locale.codes?.length) locales[locale.path] = locale.codes[0]!
  }
  if (Object.keys(locales).length === 0) return undefined
  return { defaultLocale: i18n.defaultLocale, locales }
}

export function buildSiteWithBase(siteUrl: string | undefined, base: string | undefined): string {
  const normalizedBase = (!base || base === '/') ? '' : '/' + base.replace(/^\/|\/$/g, '')
  return (siteUrl?.replace(/\/$/, '') ?? '') + normalizedBase
}

/**
 * Site URL for the sitemap and the feed: `sitemap.siteUrl` replaces Astro's
 * `site` for those two, while the `Sitemap:` line in robots.txt stays on the
 * deploy origin — see docs/guides/site-url-and-base.md.
 *
 * `siteUrl` is the bare origin (used for audits), `effectiveSiteUrl` carries
 * `base` and is what ends up in the generated URLs.
 */
export function resolveSiteUrls(
  configuredSiteUrl: string | undefined,
  astroConfig: AstroConfig | undefined,
): { siteUrl: string | undefined; effectiveSiteUrl: string } {
  const siteUrl = (
    configuredSiteUrl ?? (astroConfig?.site ? String(astroConfig.site) : undefined)
  )?.replace(/\/$/, '')
  return { siteUrl, effectiveSiteUrl: buildSiteWithBase(siteUrl, astroConfig?.base) }
}
