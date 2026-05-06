import type { AuditIssue, ResolvedSitemapEntry, SitemapOptions } from './types.js'

export function auditSitemap(
  entries: ResolvedSitemapEntry[],
  options: SitemapOptions,
  siteUrl: string | undefined,
): AuditIssue[] {
  const issues: AuditIssue[] = []

  if (!siteUrl) {
    issues.push({
      level: 'warn',
      code: 'NO_SITE_URL',
      message:
        '[@casoon/astro-site-files] No site URL configured. Set `site` in astro.config or pass `sitemap.siteUrl`. ' +
        'Sitemap <loc> entries will be relative paths only.',
    })
  }

  if (entries.length === 0 && options.audit?.warnOnEmpty !== false) {
    issues.push({
      level: 'warn',
      code: 'EMPTY_SITEMAP',
      message:
        '[@casoon/astro-site-files] Sitemap has no entries. ' +
        'Check that your build produced pages or that your `sitemap.sources` return data.',
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
      code: 'DUPLICATE_URLS',
      message: `[@casoon/astro-site-files] ${duplicates.size} duplicate URL(s): ${sample}${suffix}. Duplicates removed (last wins).`,
    })
  }

  const invalid = entries.filter(e => e.priority < 0 || e.priority > 1)
  if (invalid.length > 0) {
    issues.push({
      level: 'warn',
      code: 'INVALID_PRIORITY',
      message: `[@casoon/astro-site-files] ${invalid.length} entry/entries have priority outside [0, 1].`,
    })
  }

  return issues
}
