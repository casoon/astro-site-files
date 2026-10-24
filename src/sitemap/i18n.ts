import type { HreflangLink, I18nOptions, ResolvedSitemapEntry } from './types.js'

export function buildI18nLinks(
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
    // x-default tells search engines which variant to serve for unmatched locales.
    const fallback = group.find(g => g.locale === defaultLocale)
    if (fallback) links.push({ hreflang: 'x-default', href: fallback.entry.loc })
    return { ...entry, links }
  })
}
