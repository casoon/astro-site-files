/**
 * 07 — Sitemap with i18n hreflang
 *
 * When `i18n` is configured, entries are grouped by their canonical path
 * (path without locale prefix). Each page gets <xhtml:link rel="alternate">
 * entries for all sibling locale variants.
 *
 * `defaultLocale` is the locale used for pages without a prefix (e.g. /about/).
 * `locales` maps path prefixes to BCP 47 language tags.
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
        i18n: {
          defaultLocale: 'en',
          locales: {
            en: 'en',
            de: 'de-DE',
            fr: 'fr-FR',
          },
        },
      },
    }),
  ],
})
