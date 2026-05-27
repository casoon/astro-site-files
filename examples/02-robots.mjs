/**
 * 02 — robots.txt
 *
 * The recommended approach is to start with a preset. Presets configure
 * group defaults and known-bot rules in one step; `disallow` and `agents`
 * add path rules and per-agent settings on top.
 *
 * Presets:
 *   seoOnly         — blocks AI training, archiving; search engines allowed
 *   citationFriendly — AI may read/cite content; training crawlers blocked
 *   openToAi        — everything allowed
 *   blockTraining   — AI input/search allowed; training bots and archives blocked
 *   lockdown        — everything blocked
 *
 * Tip: never disallow legal pages (/privacy, /terms, /imprint) —
 * search engines cannot read noindex tags on blocked pages.
 *
 * astro.config.mjs
 */
import siteFiles from '@casoon/astro-site-files'
import { defineConfig } from 'astro/config'

// ── A) Preset only ────────────────────────────────────────────────────────────
//
// Blocks all AI training crawlers and web archives.
// Search engines (Google, Bing, DuckDuckGo) stay allowed.

export const configA = defineConfig({
  site: 'https://example.com',
  integrations: [
    siteFiles({
      robots: {
        preset: 'seoOnly',
      },
    }),
  ],
})

// ── B) Preset + custom path rules ────────────────────────────────────────────
//
// `disallow` and `allow` apply to User-agent: * on top of the preset.

export const configB = defineConfig({
  site: 'https://example.com',
  integrations: [
    siteFiles({
      robots: {
        preset: 'seoOnly',
        disallow: ['/admin/', '/preview/', '/internal/'],
        allow: ['/admin/public/'],
      },
    }),
  ],
})

// ── C) Preset + group override ────────────────────────────────────────────────
//
// Also block SEO scanners (AhrefsBot, SemrushBot, etc.).
// Note: this prevents competitors from analysing your backlinks, but also
// prevents you from using those tools on your own site.

export const configC = defineConfig({
  site: 'https://example.com',
  integrations: [
    siteFiles({
      robots: {
        preset: 'seoOnly',
        groups: { seoScanners: 'disallow' },
      },
    }),
  ],
})

// ── D) Preset + per-bot override ─────────────────────────────────────────────
//
// Fine-tune individual bots on top of a preset.

export const configD = defineConfig({
  site: 'https://example.com',
  integrations: [
    siteFiles({
      robots: {
        preset: 'blockTraining',
        bots: { PerplexityBot: 'disallow' },  // also block AI search
      },
    }),
  ],
})

// ── E) Manual rules (no preset) ──────────────────────────────────────────────
//
// Use `agents` for per-bot rules when you need full manual control.

export default defineConfig({
  site: 'https://example.com',
  integrations: [
    siteFiles({
      robots: {
        disallow: ['/admin/', '/preview/'],
        crawlDelay: 2,
        agents: [
          {
            // Slow down aggressive crawlers without blocking them
            userAgent: ['AhrefsBot', 'SemrushBot'],
            crawlDelay: 10,
          },
          {
            userAgent: 'BadBot',
            disallow: ['/'],
          },
        ],
      },
    }),
  ],
})
