import { describe, expect, it } from 'vitest'
import { renderSitemapIndex, renderSitemapXml } from './render.js'

describe('renderSitemapXml', () => {
  it('escapes XML values in URLs and hreflang links', () => {
    const result = renderSitemapXml([
      {
        loc: 'https://example.com/search?q=a&b=<tag>',
        lastmod: '2026-05-09',
        changefreq: 'weekly',
        priority: 0.8,
        links: [
          {
            hreflang: 'en"gb',
            href: "https://example.com/en/search?q=a&b='tag'",
          },
        ],
      },
    ])

    expect(result).toContain('<loc>https://example.com/search?q=a&amp;b=&lt;tag&gt;</loc>')
    expect(result).toContain('hreflang="en&quot;gb"')
    expect(result).toContain('href="https://example.com/en/search?q=a&amp;b=&apos;tag&apos;"')
  })
})

describe('renderSitemapIndex', () => {
  it('escapes XML values in index entries', () => {
    const result = renderSitemapIndex([
      {
        loc: 'https://example.com/sitemap.xml?lang=de&v=1',
        lastmod: '2026-05-09',
      },
    ])

    expect(result).toContain('<loc>https://example.com/sitemap.xml?lang=de&amp;v=1</loc>')
  })
})
