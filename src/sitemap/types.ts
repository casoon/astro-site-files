export type Changefreq =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never'

export interface SitemapEntry {
  loc: string
  lastmod?: string
  priority?: number
  changefreq?: Changefreq
}

export interface HreflangLink {
  hreflang: string
  href: string
}

export interface I18nOptions {
  defaultLocale: string
  locales: Record<string, string>
}

export interface ResolvedSitemapEntry {
  loc: string
  lastmod: string
  priority: number
  changefreq: Changefreq
  links?: HreflangLink[]
}

export type SitemapSource = () => Promise<SitemapEntry[]>

export interface RssItem {
  title: string
  description?: string
  pubDate: Date | string
  /** Full URL or root-relative path — root-relative paths are prefixed with `siteUrl`. */
  link: string
  /** Stable item identity. Defaults to `link`, which is then marked as a permalink. */
  guid?: string
  /** Overrides whether `guid` is announced as a resolvable URL. Defaults to `guid === undefined`. */
  guidIsPermaLink?: boolean
  author?: string
  categories?: string[]
  /** Raw XML injected inside `<item>` (e.g. enclosure, custom namespaced tags) */
  customData?: string
}

export interface RssConfig {
  /** Output filename. Default: `rss.xml`. */
  filename?: string
  title: string
  description: string
  /** Full URL of this feed file. Defaults to `{siteUrl}/{filename}`. */
  feedUrl?: string
  language?: string
  copyright?: string
  managingEditor?: string
  /** Raw XML injected inside `<channel>` after the standard fields */
  feedCustomData?: string
  /**
   * Additional XML namespace declarations on the `<rss>` root element.
   * The `atom` namespace is always included.
   */
  xmlns?: Record<string, string>
  getItems: (siteUrl: string) => Promise<RssItem[]> | RssItem[]
}

export interface PriorityRule {
  pattern: string | RegExp
  priority: number
  /**
   * Match the path with its locale prefix stripped, so one rule covers every
   * translation. Overrides `localeAgnosticRules` for this rule.
   */
  allLocales?: boolean
}

export interface ChangefreqRule {
  pattern: string | RegExp
  changefreq: Changefreq
  /**
   * Match the path with its locale prefix stripped, so one rule covers every
   * translation. Overrides `localeAgnosticRules` for this rule.
   */
  allLocales?: boolean
}

export interface SitemapOptions {
  siteUrl?: string
  sources?: SitemapSource[]
  exclude?: (string | RegExp)[]
  filter?: (url: string) => boolean
  /**
   * Drop pages whose `<head>` carries `<meta name="robots" content="noindex">`.
   * Default: `true` — submitting them makes Search Console report an error.
   */
  excludeNoindex?: boolean
  priority?: PriorityRule[]
  changefreq?: ChangefreqRule[]
  /**
   * Default for every `priority` / `changefreq` rule: match paths with the
   * locale prefix stripped, so a rule written once covers all translations.
   * Default `false` — patterns match the real, prefixed path. A rule's own
   * `allLocales` wins over this.
   */
  localeAgnosticRules?: boolean
  output?: {
    mode?: 'single' | 'index'
    maxUrls?: number
    filename?: string
  }
  audit?: {
    warnOnEmpty?: boolean
    errorOnDuplicates?: boolean
  }
  serialize?: (
    entry: ResolvedSitemapEntry,
  ) => ResolvedSitemapEntry | undefined | Promise<ResolvedSitemapEntry | undefined>
  /**
   * hreflang alternates. Defaults to Astro's own `i18n` config when that is set.
   */
  i18n?: I18nOptions
  /** @deprecated Use the top-level `rss` option — a feed is not part of the sitemap. */
  rss?: RssConfig
  debug?: boolean
}

