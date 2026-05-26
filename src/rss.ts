import type { RssItem } from './sitemap/types.js'

export type { RssItem }

export interface CreateRssRouteOptions {
  title: string
  description: string
  /** Full URL of this feed file. Defaults to `{siteUrl}/rss.xml`. */
  feedUrl?: string
  /** Site base URL. Auto-detected from `context.site` if omitted. */
  siteUrl?: string
  language?: string
  copyright?: string
  managingEditor?: string
  feedCustomData?: string
  xmlns?: Record<string, string>
  getItems: (siteUrl: string) => Promise<RssItem[]> | RssItem[]
}

interface RssContext {
  site?: URL | string
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cdata(str: string): string {
  return `<![CDATA[${str.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
}

function toRfcDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date)
  return d.toUTCString()
}

function renderItem(item: RssItem, siteUrl: string): string {
  const link = item.link.startsWith('http') ? item.link : `${siteUrl}${item.link}`
  const parts: string[] = [
    '  <item>',
    `    <title>${cdata(item.title)}</title>`,
    item.description ? `    <description>${cdata(item.description)}</description>` : '',
    `    <link>${escapeXml(link)}</link>`,
    `    <guid isPermaLink="true">${escapeXml(link)}</guid>`,
    `    <pubDate>${toRfcDate(item.pubDate)}</pubDate>`,
    item.author ? `    <author>${escapeXml(item.author)}</author>` : '',
    ...(item.categories ?? []).map(c => `    <category>${escapeXml(c)}</category>`),
    item.customData ? item.customData.split('\n').map(l => `    ${l}`).join('\n') : '',
    '  </item>',
  ]
  return parts.filter(Boolean).join('\n')
}

export function renderRssFeed(
  options: Omit<CreateRssRouteOptions, 'getItems'>,
  siteUrl: string,
  items: RssItem[],
): string {
  const feedUrl = options.feedUrl ?? `${siteUrl}/rss.xml`

  const channelLines: string[] = [
    '<channel>',
    `  <title>${cdata(options.title)}</title>`,
    `  <description>${cdata(options.description)}</description>`,
    `  <link>${escapeXml(siteUrl)}</link>`,
    `  <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>`,
    options.language ? `  <language>${escapeXml(options.language)}</language>` : '',
    options.copyright ? `  <copyright>${escapeXml(options.copyright)}</copyright>` : '',
    options.managingEditor ? `  <managingEditor>${escapeXml(options.managingEditor)}</managingEditor>` : '',
    `  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    options.feedCustomData ? `  ${options.feedCustomData}` : '',
    ...items.map(item => renderItem(item, siteUrl)),
    '</channel>',
  ]

  const extraNs = Object.entries(options.xmlns ?? {})
    .map(([prefix, uri]) => `xmlns:${prefix}="${escapeXml(uri)}"`)
    .join(' ')
  const rssTag = `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"${extraNs ? ` ${extraNs}` : ''}>`

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    rssTag,
    channelLines.filter(Boolean).join('\n'),
    '</rss>',
  ].join('\n')
}

/**
 * Creates an Astro API route handler that serves an RSS 2.0 feed.
 *
 * ```ts
 * // src/pages/rss.xml.ts
 * import { createRssRoute } from '@casoon/astro-site-files/rss';
 * import { getCollection } from 'astro:content';
 *
 * export const GET = createRssRoute({
 *   title: 'My Blog',
 *   description: 'Latest posts',
 *   language: 'de-DE',
 *   getItems: async (siteUrl) => {
 *     const posts = await getCollection('blog', ({ data }) => !data.draft);
 *     return posts.map(p => ({
 *       title: p.data.title,
 *       pubDate: p.data.date,
 *       link: `${siteUrl}/blog/${p.id}/`,
 *     }));
 *   },
 * });
 * ```
 */
export function createRssRoute(
  options: CreateRssRouteOptions,
): (context: RssContext) => Promise<Response> {
  return async (context: RssContext) => {
    const siteUrl = (
      options.siteUrl ?? context.site?.toString() ?? ''
    ).replace(/\/$/, '')

    const items = await options.getItems(siteUrl)
    const xml = renderRssFeed(options, siteUrl, items)

    return new Response(xml, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    })
  }
}
