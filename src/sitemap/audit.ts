import type { AuditIssue } from '../audit.js'
import type { ResolvedSitemapEntry, SitemapOptions } from './types.js'

export function auditSitemap(
  entries: ResolvedSitemapEntry[],
  options: SitemapOptions,
  siteUrl: string | undefined,
): AuditIssue[] {
  const issues: AuditIssue[] = []

  if (!siteUrl) {
    issues.push({
      level: 'warn',
      rule: 'sitemap/no-site-url',
      message: 'No site URL configured — sitemap <loc> entries will be relative paths only.',
      help: 'Set `site` in astro.config.ts or pass `sitemap.siteUrl` to produce absolute URLs.',
    })
  }

  if (entries.length === 0 && options.audit?.warnOnEmpty !== false) {
    issues.push({
      level: 'warn',
      rule: 'sitemap/empty-sitemap',
      message: 'Sitemap has no entries.',
      help: 'Verify your build produced pages or that `sitemap.sources` returns data.',
    })
  }

  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const entry of entries) {
    if (seen.has(entry.loc)) duplicates.add(entry.loc)
    seen.add(entry.loc)
  }

  if (duplicates.size > 0) {
    const sample = [...duplicates].slice(0, 3).join(', ')
    const suffix = duplicates.size > 3 ? ` … (+${duplicates.size - 3} more)` : ''
    issues.push({
      level: options.audit?.errorOnDuplicates ? 'error' : 'warn',
      rule: 'sitemap/duplicate-urls',
      message: `${duplicates.size} duplicate URL(s) found: ${sample}${suffix}. Duplicates are removed (last wins).`,
      help: 'Check `sitemap.sources` and static routes for overlapping URLs. Add `sitemap/duplicate-urls` to `audit.disable` to suppress.',
    })
  }

  const invalid = entries.filter(e => e.priority < 0 || e.priority > 1)
  if (invalid.length > 0) {
    issues.push({
      level: 'warn',
      rule: 'sitemap/invalid-priority',
      message: `${invalid.length} entry/entries have priority outside [0, 1].`,
      help: 'Sitemap priority must be a number between 0.0 and 1.0 (inclusive). Check your `priority` rules.',
    })
  }

  return issues
}
