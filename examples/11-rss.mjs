/**
 * 10 — RSS feed generation
 *
 * Two approaches:
 *
 * A) Build-time via sitemap.rss — writes rss.xml to dist/ during `astro build`.
 *    Runs in astro:build:done, outside Astro's SSR context.
 *    Use filesystem reads (e.g. gray-matter) rather than getCollection().
 *
 * B) API route via createRssRoute — serves a live feed at /rss.xml.
 *    Works in dev and SSR builds. Can use getCollection() because it runs
 *    inside Astro's SSR context.
 *
 * Both approaches can coexist: build-time for static deploys,
 * API route for dev-mode previewing.
 */

// ── A) astro.config.mjs — build-time RSS ─────────────────────────────────────

import siteFiles from '@casoon/astro-site-files'
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://example.com',
  integrations: [
    siteFiles({
      sitemap: {
        // Inject blog posts into sitemap (draft-filtered, with lastmod)
        sources: [
          async () => {
            const { readdirSync, readFileSync } = await import('node:fs')
            const matter = (await import('gray-matter')).default
            const dir = './src/content/blog'
            return readdirSync(dir)
              .filter(f => f.endsWith('.md') || f.endsWith('.mdx'))
              .map(file => {
                const { data } = matter(readFileSync(`${dir}/${file}`, 'utf-8'))
                if (data.draft) return null
                return {
                  loc: `/blog/${file.replace(/\.(md|mdx)$/, '')}/`,
                  lastmod: data.lastmod ?? data.date,
                  priority: 0.8,
                }
              })
              .filter(Boolean)
          },
        ],

        // Generate rss.xml alongside sitemap.xml
        rss: {
          title: 'My Blog',
          description: 'Latest articles about TypeScript and Astro.',
          language: 'en',
          getItems: async (siteUrl) => {
            const { readdirSync, readFileSync } = await import('node:fs')
            const matter = (await import('gray-matter')).default
            const dir = './src/content/blog'
            return readdirSync(dir)
              .filter(f => f.endsWith('.md') || f.endsWith('.mdx'))
              .map(file => {
                const { data } = matter(readFileSync(`${dir}/${file}`, 'utf-8'))
                if (data.draft) return null
                return {
                  title: data.title,
                  pubDate: data.date,
                  link: `${siteUrl}/blog/${file.replace(/\.(md|mdx)$/, '')}/`,
                  description: data.description,
                }
              })
              .filter(Boolean)
              .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
          },
        },
      },
    }),
  ],
})

// ── B) src/pages/rss.xml.ts — API route (dev + SSR) ──────────────────────────
//
// import { createRssRoute } from '@casoon/astro-site-files/rss'
// import { getCollection } from 'astro:content'
//
// export const GET = createRssRoute({
//   title: 'My Blog',
//   description: 'Latest posts',
//   language: 'de-DE',
//   getItems: async (siteUrl) => {
//     const posts = await getCollection('blog', ({ data }) => !data.draft)
//     return posts
//       .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
//       .map(p => ({
//         title: p.data.title,
//         pubDate: p.data.date,
//         link: `${siteUrl}/blog/${p.id}/`,
//         description: p.data.description,
//       }))
//   },
// })

// ── C) With custom namespace (e.g. for reading time) ─────────────────────────
//
// siteFiles({
//   sitemap: {
//     rss: {
//       title: 'My Blog',
//       description: 'Latest posts',
//       xmlns: { article: 'https://example.com/ns/' },
//       getItems: async (siteUrl) => [
//         {
//           title: 'Hello World',
//           pubDate: new Date('2024-06-01'),
//           link: `${siteUrl}/blog/hello/`,
//           customData: '<article:readingTime>5 min</article:readingTime>',
//         },
//       ],
//     },
//   },
// })
