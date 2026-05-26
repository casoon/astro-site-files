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
}

export interface ChangefreqRule {
  pattern: string | RegExp
  changefreq: Changefreq
}

export interface SitemapOptions {
  siteUrl?: string
  sources?: SitemapSource[]
  exclude?: (string | RegExp)[]
  filter?: (url: string) => boolean
  priority?: PriorityRule[]
  changefreq?: ChangefreqRule[]
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
  i18n?: I18nOptions
  rss?: RssConfig
  debug?: boolean
}

