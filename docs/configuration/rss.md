---
title: RSS feed
sidebarLabel: rss.xml
description: An RSS 2.0 feed written at build time, or served from an API route.
order: 4
---

Off by default. Written when the top-level `rss` option is set, independent of `sitemap`. (The
older `sitemap.rss` placement still works but is deprecated.)

This site has no feed, so the showcase does not include one.

## Options

```ts
interface RssConfig {
  filename?: string
  title: string
  description: string
  feedUrl?: string
  language?: string
  copyright?: string
  managingEditor?: string
  feedCustomData?: string
  xmlns?: Record<string, string>
  getItems: (siteUrl: string) => Promise<RssItem[]> | RssItem[]
}

interface RssItem {
  title: string
  description?: string
  pubDate: Date | string
  link: string
  guid?: string
  guidIsPermaLink?: boolean
  author?: string
  categories?: string[]
  customData?: string
}
```

| Option | Default | Effect |
| --- | --- | --- |
| `filename` | `rss.xml` | Output file |
| `feedUrl` | site + base + filename | `atom:link rel="self"` |
| `language` | – | e.g. `en`, `de-DE` |
| `copyright`, `managingEditor` | – | Channel fields; `managingEditor` as `email (Name)` |
| `feedCustomData` | – | Raw XML inside `<channel>` |
| `xmlns` | – | Extra namespaces on `<rss>`; `atom` is always declared |
| `getItems` | required | Receives site URL with base, returns the items |

Item links may be absolute, root-relative or bare; relative forms are joined onto the site URL.
`guid` defaults to the link and is then marked `isPermaLink="true"`. An unparseable `pubDate` is
left out instead of being written as `Invalid Date`. Titles and descriptions are wrapped in CDATA.

## Example

```ts
siteFiles({
  rss: {
    title: 'Example blog',
    description: 'Articles about TypeScript.',
    language: 'en',
    getItems: () => [
      { title: 'Hello world', pubDate: '2026-09-01T08:00:00Z', link: '/blog/hello-world/', description: 'The first post.' },
    ],
  },
})
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title><![CDATA[Example blog]]></title>
  <description><![CDATA[Articles about TypeScript.]]></description>
  <link>https://example.com</link>
  <atom:link href="https://example.com/rss.xml" rel="self" type="application/rss+xml"/>
  <language>en</language>
  <lastBuildDate>Sun, 13 Sep 2026 22:29:35 GMT</lastBuildDate>
  <item>
    <title><![CDATA[Hello world]]></title>
    <description><![CDATA[The first post.]]></description>
    <link>https://example.com/blog/hello-world/</link>
    <guid isPermaLink="true">https://example.com/blog/hello-world/</guid>
    <pubDate>Tue, 01 Sep 2026 08:00:00 GMT</pubDate>
  </item>
</channel>
</rss>
```

`getItems` runs in `astro:build:done`, where `getCollection()` is not available. Read the content
files directly, or use the API route below.

## Feed from an API route

`createRssRoute` from the `/rss` sub-path returns a `GET` handler. It runs in Astro's rendering
context, so `getCollection()` works there:

```ts
// src/pages/rss.xml.ts
import { createRssRoute } from '@casoon/astro-site-files/rss'
import { getCollection } from 'astro:content'

export const GET = createRssRoute({
  title: 'My blog',
  description: 'Latest posts',
  getItems: async (siteUrl) => {
    const posts = await getCollection('blog', ({ data }) => !data.draft)
    return posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      link: `${siteUrl}/blog/${p.id}/`,
    }))
  },
})
```

`CreateRssRouteOptions` takes the same fields as `RssConfig` without `filename`, plus an optional
`siteUrl` (default: Astro's `site`).
