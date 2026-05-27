/**
 * 06 — Sitemap with dynamic sources (content collections)
 *
 * Static pages are discovered automatically from Astro's build output.
 * Use `sources` to inject additional URLs — e.g. from content collections,
 * a CMS API, or any other async data source.
 *
 * Each source is an async function that returns SitemapEntry[].
 * Source entries are merged with static pages; last entry wins on duplicates.
 *
 * Note: sources run in astro:build:done, outside Astro's SSR context.
 * Use filesystem reads (e.g. gray-matter) rather than getCollection().
 * If you need getCollection(), generate the URLs from a static route instead.
 *
 * astro.config.mjs
 */
import siteFiles from '@casoon/astro-site-files'
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://example.com',
  integrations: [
    siteFiles({
      sitemap: {
        sources: [
          // Read blog posts from the filesystem using gray-matter
          async () => {
            const { readdirSync, readFileSync } = await import('node:fs')
            const matter = (await import('gray-matter')).default

            const files = readdirSync('./src/content/blog').filter(f => f.endsWith('.md') || f.endsWith('.mdx'))

            return files
              .map(file => {
                const raw = readFileSync(`./src/content/blog/${file}`, 'utf-8')
                const { data } = matter(raw)
                if (data.draft) return null
                const slug = file.replace(/\.(md|mdx)$/, '')
                return {
                  loc: `/blog/${slug}/`,
                  lastmod: data.lastmod ?? data.date,
                  priority: 0.8,
                }
              })
              .filter(Boolean)
          },

          // Inject hardcoded external or additional URLs
          async () => [
            { loc: 'https://example.com/sitemap-products.xml' },
          ],
        ],
      },
    }),
  ],
})
