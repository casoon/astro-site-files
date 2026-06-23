/**
 * 06 — Sitemap with priority, changefreq and exclude rules
 *
 * Rules are evaluated in order — the first match wins.
 * Patterns can be:
 *   - string  → matches if path equals or starts with the string
 *   - RegExp  → tested against the root-relative path
 *
 * Built-in defaults (applied when no rule matches):
 *   priority:   /  → 1.0  |  depth 1 → 0.9  |  depth 2 → 0.8  |  depth 3+ → 0.7
 *   changefreq: /  and content paths → weekly  |  everything else → monthly
 *
 * lastmod is derived automatically from the mtime of each generated HTML file.
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
        // Pages to exclude entirely from the sitemap
        exclude: [
          '/404/',
          '/preview/',
          '/admin/',
          '/internal/',
        ],

        priority: [
          // Homepage: maximum signal
          { pattern: /^\/$/, priority: 1.0 },
          // Core service pages
          { pattern: '/services/', priority: 0.9 },
          // Blog posts
          { pattern: /^\/blog\/[^/]+\/?$/, priority: 0.8 },
          // Blog listing and about pages
          { pattern: '/blog/', priority: 0.7 },
          { pattern: '/about/', priority: 0.6 },
          // Legal pages: no SEO value
          { pattern: /^\/(privacy|terms|imprint)\/?$/, priority: 0.2 },
        ],

        changefreq: [
          // Homepage and contact: actively maintained
          { pattern: /^\/$/, changefreq: 'weekly' },
          { pattern: /^\/contact\/?$/, changefreq: 'weekly' },
          // Service pages: updated occasionally
          { pattern: '/services/', changefreq: 'monthly' },
          // Blog posts: rarely edited after publish
          { pattern: /^\/blog\/[^/]+\/?$/, changefreq: 'monthly' },
          // Legal pages: once written, barely touched
          { pattern: /^\/(privacy|terms|imprint)\/?$/, changefreq: 'yearly' },
        ],
      },
    }),
  ],
})
