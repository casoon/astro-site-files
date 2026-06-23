/**
 * 03 — robots.txt presets: full reference
 *
 * Presets configure group defaults and per-bot rules for all 25 known crawlers
 * in the built-in registry. Per-bot `bots` and group-level `groups` options
 * override the preset; explicit `agents` blocks are appended after.
 *
 * Precedence (highest → lowest):
 *   bots (per-bot) → groups (category) → preset defaults → bot defaultAction
 *
 * Groups:
 *   searchEngines — Googlebot, Bingbot, DuckDuckBot
 *   verifiedAi    — OpenAI, Anthropic, Google, Common Crawl, Perplexity, You.com, Amazon, Apple, Meta, ByteDance
 *   unknownAi     — unverified scrapers (Diffbot, Omgilibot)
 *   seoScanners   — AhrefsBot, SemrushBot, MJ12bot, DotBot
 *   archives      — ia_archiver, archive.org_bot
 *
 * BotAction values: 'allow' | 'disallow' | 'inherit'
 *   inherit = no rule emitted; User-agent: * applies
 *
 * astro.config.mjs
 */
import siteFiles from '@casoon/astro-site-files'
import { defineConfig } from 'astro/config'

// ── seoOnly ───────────────────────────────────────────────────────────────────
//
// searchEngines: allow  verifiedAi: disallow  unknownAi: disallow
// seoScanners: inherit  archives: disallow
//
// Good for: company sites, blogs, agencies.
// Search engines stay; all AI training and archiving blocked.

export const configSeoOnly = defineConfig({
  site: 'https://example.com',
  integrations: [siteFiles({ robots: { preset: 'seoOnly' } })],
})

// ── citationFriendly ──────────────────────────────────────────────────────────
//
// searchEngines: allow  verifiedAi: allow  unknownAi: disallow
// seoScanners: inherit  archives: inherit
// + GPTBot, Google-Extended, CCBot, Bytespider, Applebot-Extended → disallow
//
// Good for: content sites that want AI assistants to cite them,
//           but don't want their content used for model training.

export const configCitationFriendly = defineConfig({
  site: 'https://example.com',
  integrations: [siteFiles({ robots: { preset: 'citationFriendly' } })],
})

// ── openToAi ─────────────────────────────────────────────────────────────────
//
// searchEngines: allow  verifiedAi: allow  unknownAi: allow
// seoScanners: inherit  archives: allow
//
// Good for: open-source projects, documentation, anything you want
//           fully indexed everywhere including AI datasets.

export const configOpenToAi = defineConfig({
  site: 'https://example.com',
  integrations: [siteFiles({ robots: { preset: 'openToAi' } })],
})

// ── blockTraining ─────────────────────────────────────────────────────────────
//
// searchEngines: allow  verifiedAi: allow  unknownAi: disallow
// seoScanners: inherit  archives: disallow
// + GPTBot, ClaudeBot, anthropic-ai, Google-Extended, CCBot,
//   Bytespider, meta-externalagent, Applebot-Extended → disallow
//
// Good for: publishers and premium content sites. AI assistants can read
//           and cite content; training crawlers and archives are blocked.

export const configBlockTraining = defineConfig({
  site: 'https://example.com',
  integrations: [siteFiles({ robots: { preset: 'blockTraining' } })],
})

// ── lockdown ──────────────────────────────────────────────────────────────────
//
// All groups: disallow
//
// Good for: staging environments, internal tools, or sites that should
//           not be crawled by anyone.

export const configLockdown = defineConfig({
  site: 'https://example.com',
  integrations: [siteFiles({ robots: { preset: 'lockdown' } })],
})

// ── Group override ────────────────────────────────────────────────────────────
//
// Adjust one category without changing the rest of the preset.

export const configGroupOverride = defineConfig({
  site: 'https://example.com',
  integrations: [
    siteFiles({
      robots: {
        preset: 'seoOnly',
        groups: { seoScanners: 'disallow' },  // also block Ahrefs, Semrush, etc.
      },
    }),
  ],
})

// ── Per-bot override ──────────────────────────────────────────────────────────
//
// Override a specific bot regardless of its group.

export const configBotOverride = defineConfig({
  site: 'https://example.com',
  integrations: [
    siteFiles({
      robots: {
        preset: 'blockTraining',
        bots: {
          PerplexityBot: 'disallow',  // also block AI search (not covered by preset)
          Googlebot: 'allow',         // explicitly confirm (already allowed by preset)
        },
      },
    }),
  ],
})

// ── Custom bot (extraBots) ────────────────────────────────────────────────────
//
// Add a bot that is not in the built-in registry.
// It will be classified using the same group/preset logic.

export const configExtraBots = defineConfig({
  site: 'https://example.com',
  integrations: [
    siteFiles({
      robots: {
        preset: 'seoOnly',
        extraBots: [
          {
            id: 'MyCustomBot',
            provider: 'Example Corp',
            userAgents: ['MyCustomBot/1.0'],
            categories: ['ai-training'],
            verified: false,
          },
        ],
      },
    }),
  ],
})

// ── Preset + path rules + agents ──────────────────────────────────────────────
//
// Combine preset-based bot control with path-level rules and
// manual per-agent settings. This is the most common production setup.

export default defineConfig({
  site: 'https://example.com',
  integrations: [
    siteFiles({
      robots: {
        preset: 'seoOnly',
        disallow: ['/admin/', '/preview/'],   // hidden from all crawlers via User-agent: *
        agents: [
          // Slow down SEO scanners rather than blocking them completely
          { userAgent: ['AhrefsBot', 'SemrushBot'], crawlDelay: 10 },
        ],
      },
    }),
  ],
})
