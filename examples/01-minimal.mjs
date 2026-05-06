/**
 * 01 — Minimal setup
 *
 * robots.txt and sitemap.xml are enabled by default.
 * All pages that Astro generates are included in the sitemap automatically.
 * No further configuration is required for a basic site.
 *
 * astro.config.mjs
 */
import siteFiles from '@casoon/astro-site-files'
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://example.com',
  integrations: [
    siteFiles(),
  ],
})
