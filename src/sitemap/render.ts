import type { ResolvedSitemapEntry } from './types.js'

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>'

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function renderSitemapXml(entries: ResolvedSitemapEntry[], comment?: string): string {
  const hasHreflang = entries.some(e => e.links && e.links.length > 0)
  const urlsetAttrs = hasHreflang
    ? 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"'
    : 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'

  const lines: string[] = [XML_HEADER]
  if (comment) lines.push(`<!-- ${comment} -->`)
  lines.push(`<urlset ${urlsetAttrs}>`)

  for (const entry of entries) {
    lines.push('  <url>')
    lines.push(`    <loc>${escapeXml(entry.loc)}</loc>`)
    lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`)
    lines.push(`    <changefreq>${escapeXml(entry.changefreq)}</changefreq>`)
    lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`)
    if (entry.links) {
      for (const link of entry.links) {
        lines.push(`    <xhtml:link rel="alternate" hreflang="${escapeXml(link.hreflang)}" href="${escapeXml(link.href)}"/>`)
      }
    }
    lines.push('  </url>')
  }

  lines.push('</urlset>')
  return lines.join('\n')
}

export function renderSitemapIndex(sitemaps: Array<{ loc: string; lastmod: string }>): string {
  const lines: string[] = [
    XML_HEADER,
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ]
  for (const sm of sitemaps) {
    lines.push('  <sitemap>')
    lines.push(`    <loc>${escapeXml(sm.loc)}</loc>`)
    lines.push(`    <lastmod>${escapeXml(sm.lastmod)}</lastmod>`)
    lines.push('  </sitemap>')
  }
  lines.push('</sitemapindex>')
  return lines.join('\n')
}
