import { describe, expect, it } from 'vitest'
import { createRssRoute } from './rss.js'
import type { RssItem } from './rss.js'

const SITE = 'https://example.com'

function item(overrides: Partial<RssItem> = {}): RssItem {
  return {
    title: 'Test Post',
    pubDate: new Date('2024-06-01'),
    link: `${SITE}/blog/test/`,
    ...overrides,
  }
}

async function render(options: Parameters<typeof createRssRoute>[0], siteUrl = SITE): Promise<string> {
  const handler = createRssRoute(options)
  const res = await handler({ site: new URL(siteUrl) })
  return res.text()
}

describe('createRssRoute', () => {
  it('returns a Response with correct Content-Type', async () => {
    const handler = createRssRoute({
      title: 'Feed',
      description: 'Test',
      getItems: async () => [],
    })
    const res = await handler({ site: new URL(SITE) })
    expect(res.headers.get('Content-Type')).toContain('application/xml')
  })

  it('uses context.site as base URL', async () => {
    const xml = await render({ title: 'Feed', description: 'Test', getItems: async () => [item()] })
    expect(xml).toContain(`<link>${SITE}</link>`)
  })

  it('options.siteUrl overrides context.site', async () => {
    const handler = createRssRoute({
      title: 'Feed',
      description: 'Test',
      siteUrl: 'https://other.com',
      getItems: async () => [],
    })
    const xml = await (await handler({ site: new URL(SITE) })).text()
    expect(xml).toContain('<link>https://other.com</link>')
    expect(xml).not.toContain(SITE)
  })

  it('strips trailing slash from siteUrl', async () => {
    const handler = createRssRoute({
      title: 'Feed',
      description: 'Test',
      siteUrl: 'https://example.com/',
      getItems: async () => [],
    })
    const xml = await (await handler({})).text()
    expect(xml).toContain('<link>https://example.com</link>')
  })
})

describe('RSS structure', () => {
  it('starts with XML declaration', async () => {
    const xml = await render({ title: 'F', description: 'D', getItems: async () => [] })
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/)
  })

  it('has rss 2.0 root with atom namespace', async () => {
    const xml = await render({ title: 'F', description: 'D', getItems: async () => [] })
    expect(xml).toContain('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">')
  })

  it('includes title and description in CDATA', async () => {
    const xml = await render({ title: 'My Blog', description: 'Posts about code', getItems: async () => [] })
    expect(xml).toContain('<![CDATA[My Blog]]>')
    expect(xml).toContain('<![CDATA[Posts about code]]>')
  })

  it('includes atom:link self reference', async () => {
    const xml = await render({ title: 'F', description: 'D', getItems: async () => [] })
    expect(xml).toContain('rel="self"')
    expect(xml).toContain('type="application/rss+xml"')
  })

  it('uses custom feedUrl for atom:link self', async () => {
    const xml = await render({
      title: 'F', description: 'D',
      feedUrl: 'https://example.com/feed.xml',
      getItems: async () => [],
    })
    expect(xml).toContain('href="https://example.com/feed.xml"')
  })

  it('defaults feedUrl to siteUrl/rss.xml', async () => {
    const xml = await render({ title: 'F', description: 'D', getItems: async () => [] })
    expect(xml).toContain(`href="${SITE}/rss.xml"`)
  })

  it('includes optional channel fields', async () => {
    const xml = await render({
      title: 'F', description: 'D',
      language: 'de-DE',
      copyright: 'Copyright 2024',
      managingEditor: 'editor@example.com',
      getItems: async () => [],
    })
    expect(xml).toContain('<language>de-DE</language>')
    expect(xml).toContain('<copyright>Copyright 2024</copyright>')
    expect(xml).toContain('<managingEditor>editor@example.com</managingEditor>')
  })

  it('injects feedCustomData into channel', async () => {
    const xml = await render({
      title: 'F', description: 'D',
      feedCustomData: '<generator>MyApp</generator>',
      getItems: async () => [],
    })
    expect(xml).toContain('<generator>MyApp</generator>')
  })

  it('adds custom xmlns declarations to rss root', async () => {
    const xml = await render({
      title: 'F', description: 'D',
      xmlns: { article: 'https://example.com/ns/', dc: 'http://purl.org/dc/elements/1.1/' },
      getItems: async () => [],
    })
    expect(xml).toContain('xmlns:article="https://example.com/ns/"')
    expect(xml).toContain('xmlns:dc="http://purl.org/dc/elements/1.1/"')
    expect(xml).toContain('xmlns:atom="http://www.w3.org/2005/Atom"')
  })
})

describe('RSS items', () => {
  it('renders item with title, link, guid, pubDate', async () => {
    const xml = await render({
      title: 'F', description: 'D',
      getItems: async () => [item({ title: 'Hello World', link: `${SITE}/blog/hello/`, pubDate: new Date('2024-03-15') })],
    })
    expect(xml).toContain('<![CDATA[Hello World]]>')
    expect(xml).toContain(`<link>${SITE}/blog/hello/</link>`)
    expect(xml).toContain(`<guid isPermaLink="true">${SITE}/blog/hello/</guid>`)
    expect(xml).toContain('<pubDate>')
  })

  it('prepends siteUrl to root-relative link', async () => {
    const xml = await render({
      title: 'F', description: 'D',
      getItems: async () => [item({ link: '/blog/post/' })],
    })
    expect(xml).toContain(`<link>${SITE}/blog/post/</link>`)
  })

  it('renders description in CDATA', async () => {
    const xml = await render({
      title: 'F', description: 'D',
      getItems: async () => [item({ description: 'Short summary' })],
    })
    expect(xml).toContain('<![CDATA[Short summary]]>')
  })

  it('renders categories', async () => {
    const xml = await render({
      title: 'F', description: 'D',
      getItems: async () => [item({ categories: ['Tech', 'AI'] })],
    })
    expect(xml).toContain('<category>Tech</category>')
    expect(xml).toContain('<category>AI</category>')
  })

  it('renders author', async () => {
    const xml = await render({
      title: 'F', description: 'D',
      getItems: async () => [item({ author: 'Jane Doe' })],
    })
    expect(xml).toContain('<author>Jane Doe</author>')
  })

  it('injects customData into item', async () => {
    const xml = await render({
      title: 'F', description: 'D',
      getItems: async () => [item({ customData: '<readingTime>5 min</readingTime>' })],
    })
    expect(xml).toContain('<readingTime>5 min</readingTime>')
  })

  it('renders multiple items', async () => {
    const xml = await render({
      title: 'F', description: 'D',
      getItems: async () => [
        item({ title: 'Post 1', link: `${SITE}/1/` }),
        item({ title: 'Post 2', link: `${SITE}/2/` }),
      ],
    })
    expect(xml).toContain('<![CDATA[Post 1]]>')
    expect(xml).toContain('<![CDATA[Post 2]]>')
  })

  it('handles string pubDate', async () => {
    const xml = await render({
      title: 'F', description: 'D',
      getItems: async () => [item({ pubDate: '2024-01-15' })],
    })
    expect(xml).toContain('<pubDate>')
    expect(xml).not.toContain('Invalid Date')
  })

  it('passes siteUrl to getItems', async () => {
    const received: string[] = []
    await render({
      title: 'F', description: 'D',
      getItems: async (siteUrl) => { received.push(siteUrl); return [] },
    })
    expect(received[0]).toBe(SITE)
  })

  it('XML-escapes special chars in URLs', async () => {
    const xml = await render({
      title: 'F', description: 'D',
      getItems: async () => [item({ link: `${SITE}/search?q=a&b=c` })],
    })
    expect(xml).toContain('q=a&amp;b=c')
  })

  it('handles CDATA with ]]> in content', async () => {
    const xml = await render({
      title: 'F', description: 'D',
      getItems: async () => [item({ title: 'Code: a]]>b' })],
    })
    expect(xml).toContain('<![CDATA[Code: a]]]]><![CDATA[>b]]>')
  })
})
