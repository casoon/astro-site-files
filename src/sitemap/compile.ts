import type { Changefreq, I18nOptions, ResolvedSitemapEntry, SitemapEntry, SitemapOptions } from './types.js'

const BUILT_IN_PRIORITY: Array<{ pattern: RegExp; priority: number }> = [
  { pattern: /^\/$/, priority: 1.0 },
]

function depthPriority(urlPath: string): number {
  const depth = urlPath.split('/').filter(Boolean).length
  if (depth === 0) return 1.0
  if (depth === 1) return 0.9
  if (depth === 2) return 0.8
  return 0.7
}

const BUILT_IN_CHANGEFREQ: Array<{ pattern: RegExp; changefreq: Changefreq }> = [
  { pattern: /^\/$/, changefreq: 'weekly' },
  { pattern: /\/(blog|artikel|insights|news|posts?|updates?)\//,changefreq: 'weekly' },
]

const DEFAULT_CHANGEFREQ: Changefreq = 'monthly'

function matchesPattern(urlPath: string, pattern: string | RegExp): boolean {
  if (typeof pattern === 'string') {
    return urlPath === pattern || urlPath.startsWith(pattern)
  }
  return pattern.test(urlPath)
}

/**
 * Strips a locale prefix so the built-in depth and pattern rules see the same
 * path for every translation — otherwise `/de/` would rank a whole level below
 * `/` purely because of its prefix. User rules still match the real path.
 */
function stripLocalePrefix(urlPath: string, i18n: I18nOptions | undefined): string {
  if (!i18n) return urlPath
  for (const locale of Object.keys(i18n.locales)) {
    const prefix = `/${locale}`
    if (urlPath === prefix || urlPath === `${prefix}/`) return '/'
    if (urlPath.startsWith(`${prefix}/`)) return urlPath.slice(prefix.length)
  }
  return urlPath
}

/**
 * A rule matches the locale-stripped path when it opts in — per rule via
 * `allLocales`, otherwise via the `localeAgnosticRules` default.
 */
function ruleMatches(
  rule: { pattern: string | RegExp; allLocales?: boolean },
  urlPath: string,
  canonicalPath: string,
  localeAgnostic: boolean,
): boolean {
  return matchesPattern((rule.allLocales ?? localeAgnostic) ? canonicalPath : urlPath, rule.pattern)
}

function resolvePriority(
  urlPath: string,
  canonicalPath: string,
  options: SitemapOptions,
): number {
  const localeAgnostic = options.localeAgnosticRules ?? false
  for (const rule of options.priority ?? []) {
    if (ruleMatches(rule, urlPath, canonicalPath, localeAgnostic)) return rule.priority
  }
  for (const rule of BUILT_IN_PRIORITY) {
    if (rule.pattern.test(canonicalPath)) return rule.priority
  }
  return depthPriority(canonicalPath)
}

function resolveChangefreq(
  urlPath: string,
  canonicalPath: string,
  options: SitemapOptions,
): Changefreq {
  const localeAgnostic = options.localeAgnosticRules ?? false
  for (const rule of options.changefreq ?? []) {
    if (ruleMatches(rule, urlPath, canonicalPath, localeAgnostic)) return rule.changefreq
  }
  for (const rule of BUILT_IN_CHANGEFREQ) {
    if (rule.pattern.test(canonicalPath)) return rule.changefreq
  }
  return DEFAULT_CHANGEFREQ
}

const TODAY = new Date().toISOString().split('T')[0]!

export function resolveEntry(
  entry: SitemapEntry,
  options: SitemapOptions,
  siteUrl: string,
): ResolvedSitemapEntry {
  const base = siteUrl.replace(/\/$/, '')
  let loc = entry.loc
  if (!loc.startsWith('http')) {
    const path = loc.startsWith('/') ? loc : `/${loc}`
    loc = base ? `${base}${path}` : path
  }
  const urlPath = base ? loc.replace(base, '') || '/' : loc
  const canonicalPath = stripLocalePrefix(urlPath, options.i18n)
  return {
    loc,
    lastmod: entry.lastmod ?? TODAY,
    priority: entry.priority ?? resolvePriority(urlPath, canonicalPath, options),
    changefreq: entry.changefreq ?? resolveChangefreq(urlPath, canonicalPath, options),
  }
}

export function deduplicateEntries(entries: ResolvedSitemapEntry[]): ResolvedSitemapEntry[] {
  const map = new Map<string, ResolvedSitemapEntry>()
  for (const entry of entries) {
    map.set(entry.loc, entry)
  }
  return [...map.values()]
}
