/**
 * 10 — Audit configuration
 *
 * Build-time audit hints warn about missing fields and misconfigurations.
 * This example shows how to silence all hints or suppress individual rules.
 *
 * All rule IDs:
 *   robots/legal-pages-blocked
 *   llms/no-description
 *   llms/no-sections
 *   llms/sections-without-links
 *   security/no-expires
 *   security/no-policy
 *   humans/no-team
 *   humans/no-technology
 *   sitemap/no-site-url
 *   sitemap/empty-sitemap
 *   sitemap/duplicate-urls
 *   sitemap/invalid-priority
 *
 * astro.config.mjs
 */
import siteFiles from '@casoon/astro-site-files'
import { defineConfig } from 'astro/config'

// ── A) Disable all audit hints ────────────────────────────────────────────────

export const configA = defineConfig({
  integrations: [
    siteFiles({
      robots: { disallow: ['/admin/'] },
      llms: { title: 'My Site' },
      audit: false,
    }),
  ],
})

// ── B) Suppress specific rules ────────────────────────────────────────────────

export default defineConfig({
  site: 'https://example.com',

  integrations: [
    siteFiles({
      robots: { disallow: ['/admin/'] },

      llms: {
        title: 'My Site',
        // no description or sections — normally triggers llms/no-description and
        // llms/no-sections, but both are suppressed below
      },

      security: {
        contact: 'mailto:info@casoon.de',
        // no expires — normally triggers security/no-expires (suppressed below)
      },

      humans: true,

      audit: {
        disable: [
          'llms/no-description',
          'llms/no-sections',
          'security/no-expires',
          'humans/no-team',
          'humans/no-technology',
        ],
      },
    }),
  ],
})
