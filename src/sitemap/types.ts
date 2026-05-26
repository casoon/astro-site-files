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
  debug?: boolean
}

