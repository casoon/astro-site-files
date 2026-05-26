import type { SitemapOptions } from './sitemap/types.js'

export type { SitemapOptions }
export type {
  SitemapEntry,
  ResolvedSitemapEntry,
  SitemapSource,
  PriorityRule,
  ChangefreqRule,
  I18nOptions,
  Changefreq,
} from './sitemap/types.js'

export interface RobotsOptions {
  disallow?: string[]
  allow?: string[]
  /** true = auto-derive from site URL, string = explicit URL, false = omit */
  sitemap?: boolean | string
  crawlDelay?: number
  agents?: Array<{
    userAgent: string | string[]
    allow?: string[]
    disallow?: string[]
    crawlDelay?: number
  }>
}

export interface LlmsLink {
  title: string
  url: string
  description?: string
}

export interface LlmsSection {
  title: string
  links?: LlmsLink[]
}

export type LlmsSource = () => LlmsSection | Promise<LlmsSection>

export interface LlmsOptions {
  title: string
  description?: string
  details?: string
  sections?: LlmsSection[]
  /** Async functions that return additional sections — merged after `sections` */
  sources?: LlmsSource[]
}

export interface SecurityOptions {
  /** Required by RFC 9116 — mailto: or https: URI */
  contact: string | string[]
  policy?: string
  acknowledgments?: string
  preferredLanguages?: string[]
  /** ISO date string or Date — required by spec */
  expires?: string | Date
  encryption?: string
  hiring?: string
  canonical?: string
}

export interface HumansTeamMember {
  name: string
  role?: string
  twitter?: string
  location?: string
  email?: string
}

export interface HumansOptions {
  team?: HumansTeamMember[]
  thanks?: string[]
  technology?: string[]
  note?: string
  /** Defaults to today's date */
  lastUpdate?: string | Date
}

export interface SiteFilesOptions {
  /** robots.txt — enabled by default */
  robots?: RobotsOptions | boolean
  /** llms.txt — disabled unless configured with { title } */
  llms?: LlmsOptions | boolean
  /** sitemap.xml — enabled by default, generated directly in astro:build:done */
  sitemap?: SitemapOptions | boolean
  /** /.well-known/security.txt — disabled unless configured with { contact } */
  security?: SecurityOptions | boolean
  /** humans.txt — disabled unless configured */
  humans?: HumansOptions | boolean
  /**
   * Build-time audit hints — warns about misconfigurations and missing fields.
   * Set to false to silence all hints, or pass { disable: ['rule/id'] } to suppress specific rules.
   */
  audit?: import('./audit.js').AuditOptions | boolean
  debug?: boolean
}
