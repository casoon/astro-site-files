import type { HumansOptions, LlmsOptions, RobotsOptions, SecurityOptions } from './types.js'

export interface AuditIssue {
  level: 'info' | 'warn' | 'error'
  rule: string
  message: string
  help: string
}

export interface AuditOptions {
  /** Set to false to silence all build-time audit hints. Default: true */
  enabled?: boolean
  /** Rule IDs to suppress individually, e.g. ['llms/no-sections', 'humans/no-team'] */
  disable?: string[]
}

export function filterIssues(issues: AuditIssue[], options: AuditOptions | boolean | undefined): AuditIssue[] {
  if (options === false) return []
  if (typeof options === 'object') {
    if (options.enabled === false) return []
    if (options.disable?.length) {
      return issues.filter(i => !options.disable!.includes(i.rule))
    }
  }
  return issues
}

// ── robots.txt ────────────────────────────────────────────────────────────────

const LEGAL_PATTERNS = [
  '/datenschutz',
  '/privacy',
  '/agb',
  '/terms',
  '/impressum',
  '/imprint',
  '/legal',
]

export function auditRobots(options: RobotsOptions): AuditIssue[] {
  const issues: AuditIssue[] = []

  const blockedLegal = (options.disallow ?? []).filter(path =>
    LEGAL_PATTERNS.some(p => path === p || path.startsWith(p + '/')),
  )
  if (blockedLegal.length > 0) {
    issues.push({
      level: 'warn',
      rule: 'robots/legal-pages-blocked',
      message: `Legal pages are disallowed in robots.txt: ${blockedLegal.join(', ')}`,
      help: 'Search engines cannot read noindex tags on blocked pages. Legal pages (Datenschutz, AGB, Impressum) are generally safe to crawl — consider removing these Disallow rules.',
    })
  }

  return issues
}

// ── llms.txt ──────────────────────────────────────────────────────────────────

export function auditLlms(options: LlmsOptions): AuditIssue[] {
  const issues: AuditIssue[] = []

  if (!options.description) {
    issues.push({
      level: 'info',
      rule: 'llms/no-description',
      message: 'llms.txt has no description',
      help: 'Add a short summary of your site or company under `description`. AI models use this to understand your content at a glance.',
    })
  }

  if (!options.sections?.length) {
    issues.push({
      level: 'info',
      rule: 'llms/no-sections',
      message: 'llms.txt has no sections',
      help: 'Add sections with links to key pages — contact, services, team, location, working method. This gives AI models structured access to your most important content.',
    })
  } else {
    const totalLinks = options.sections.reduce((sum, s) => sum + (s.links?.length ?? 0), 0)
    if (totalLinks === 0) {
      issues.push({
        level: 'info',
        rule: 'llms/sections-without-links',
        message: 'llms.txt sections have no links',
        help: 'Add `links` entries to your sections pointing to canonical pages on your site.',
      })
    }
  }

  return issues
}

// ── security.txt ──────────────────────────────────────────────────────────────

export function auditSecurity(options: SecurityOptions): AuditIssue[] {
  const issues: AuditIssue[] = []

  if (!options.expires) {
    issues.push({
      level: 'warn',
      rule: 'security/no-expires',
      message: 'security.txt has no Expires field',
      help: 'RFC 9116 requires an Expires date so that outdated contact information is not trusted. Add `expires` as an ISO 8601 date string, e.g. "2027-01-01T00:00:00.000Z".',
    })
  }

  if (!options.policy) {
    issues.push({
      level: 'info',
      rule: 'security/no-policy',
      message: 'security.txt has no Policy field',
      help: 'Add a `policy` URL pointing to your security disclosure policy. This tells researchers how you handle reports.',
    })
  }

  return issues
}

// ── humans.txt ────────────────────────────────────────────────────────────────

export function auditHumans(options: HumansOptions): AuditIssue[] {
  const issues: AuditIssue[] = []

  if (!options.team?.length) {
    issues.push({
      level: 'info',
      rule: 'humans/no-team',
      message: 'humans.txt has no team entries',
      help: 'Add a `team` array with at least one member to credit the people behind the site.',
    })
  }

  if (!options.technology?.length) {
    issues.push({
      level: 'info',
      rule: 'humans/no-technology',
      message: 'humans.txt has no technology entries',
      help: 'Add a `technology` array listing the tools used to build the site (e.g. ["Astro", "TypeScript"]).',
    })
  }

  return issues
}
