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

describe('renderSitemapXml priority formatting', () => {
  it('keeps the conventional one-decimal form for round values', () => {
    const result = renderSitemapXml([
      { loc: 'https://example.com/', lastmod: '2026-05-09', changefreq: 'weekly', priority: 1 },
      { loc: 'https://example.com/a/', lastmod: '2026-05-09', changefreq: 'weekly', priority: 0.7 },
    ])

    expect(result).toContain('<priority>1.0</priority>')
    expect(result).toContain('<priority>0.7</priority>')
  })

  it('does not round away a deliberately configured priority', () => {
    const result = renderSitemapXml([
      { loc: 'https://example.com/a/', lastmod: '2026-05-09', changefreq: 'weekly', priority: 0.55 },
      { loc: 'https://example.com/b/', lastmod: '2026-05-09', changefreq: 'weekly', priority: 0.85 },
    ])

    expect(result).toContain('<priority>0.55</priority>')
    expect(result).toContain('<priority>0.85</priority>')
  })
})

