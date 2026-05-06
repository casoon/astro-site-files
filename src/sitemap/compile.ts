import type { Changefreq, ResolvedSitemapEntry, SitemapEntry, SitemapOptions } from './types.js'

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

function resolvePriority(urlPath: string, userRules: SitemapOptions['priority']): number {
  for (const rule of userRules ?? []) {
    if (matchesPattern(urlPath, rule.pattern)) return rule.priority
  }
  for (const rule of BUILT_IN_PRIORITY) {
    if (rule.pattern.test(urlPath)) return rule.priority
  }
  return depthPriority(urlPath)
}

function resolveChangefreq(urlPath: string, userRules: SitemapOptions['changefreq']): Changefreq {
  for (const rule of userRules ?? []) {
    if (matchesPattern(urlPath, rule.pattern)) return rule.changefreq
  }
  for (const rule of BUILT_IN_CHANGEFREQ) {
    if (rule.pattern.test(urlPath)) return rule.changefreq
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
  return {
    loc,
    lastmod: entry.lastmod ?? TODAY,
    priority: entry.priority ?? resolvePriority(urlPath, options.priority),
    changefreq: entry.changefreq ?? resolveChangefreq(urlPath, options.changefreq),
  }
}

export function deduplicateEntries(entries: ResolvedSitemapEntry[]): ResolvedSitemapEntry[] {
  const map = new Map<string, ResolvedSitemapEntry>()
  for (const entry of entries) {
    map.set(entry.loc, entry)
  }
  return [...map.values()]
}
