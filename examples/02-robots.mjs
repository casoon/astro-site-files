/**
 * 02 — robots.txt with per-agent rules
 *
 * The default User-agent: * block allows everything.
 * Use `disallow` for paths that should not be indexed.
 * Use `agents` for per-bot rules on top of the wildcard block.
 *
 * Tip: do not disallow legal pages (/privacy, /terms, /imprint) —
 * search engines cannot read noindex tags on blocked pages.
 *
 * astro.config.mjs
 */
import siteFiles from '@casoon/astro-site-files'
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://example.com',
  integrations: [
    siteFiles({
      robots: {
        disallow: [
          '/admin/',
          '/preview/',
          '/internal/',
        ],
        allow: [
          '/admin/public/',  // selectively re-open a path under a blocked prefix
        ],
        crawlDelay: 2,
        sitemap: true,       // auto-derive from astro.config.site (default)

        agents: [
          {
            // Slow down aggressive crawlers without blocking them
            userAgent: ['AhrefsBot', 'SemrushBot'],
            crawlDelay: 10,
          },
          {
            // Block a specific bot entirely
            userAgent: 'BadBot',
            disallow: ['/'],
          },
        ],
      },
    }),
  ],
})
