---
title: robots.txt
description: Crawl rules from a preset, per-group and per-bot overrides, explicit agent blocks and an automatic Sitemap line.
order: 1
---

Enabled by default. `robots: false` turns it off; `robots: true` or `{}` writes a file that
allows every crawler and references the sitemap.

## Options

```ts
interface RobotsOptions {
  disallow?: string[]
  allow?: string[]
  /** true = derive from site URL, string = explicit URL, false = omit */
  sitemap?: boolean | string
  crawlDelay?: number
  preset?: Preset
  bots?: Record<string, BotAction>
  groups?: {
    searchEngines?: BotAction
    verifiedAi?: BotAction
    unknownAi?: BotAction
    seoScanners?: BotAction
    archives?: BotAction
  }
  extraBots?: RegistryBot[]
  agents?: AgentRule[]
}

type BotAction = 'allow' | 'disallow' | 'inherit'
type Preset = 'seoOnly' | 'citationFriendly' | 'openToAi' | 'blockTraining' | 'lockdown'
```

| Option | Default | Effect |
| --- | --- | --- |
| `disallow`, `allow` | `[]` | Path rules for `User-agent: *` |
| `crawlDelay` | – | `Crawl-delay` for `User-agent: *` |
| `sitemap` | `true` | `Sitemap:` line: derived from `site` and `base`, an explicit URL, or none |
| `preset` | – | Group defaults and bot rules in one step, see below |
| `groups` | – | Action for a whole bot group; overrides the preset |
| `bots` | – | Action per bot id; overrides groups and preset |
| `extraBots` | `[]` | Bots added to the built-in registry |
| `agents` | `[]` | Explicit rule blocks, appended as written |

`allow` emits `Allow: /`, `disallow` emits `Disallow: /`, `inherit` emits no block for that bot,
so `User-agent: *` applies.

## Presets

| Preset | searchEngines | verifiedAi | unknownAi | seoScanners | archives |
| --- | --- | --- | --- | --- | --- |
| `seoOnly` | allow | disallow | disallow | inherit | disallow |
| `citationFriendly` | allow | allow | disallow | inherit | inherit |
| `openToAi` | allow | allow | allow | inherit | allow |
| `blockTraining` | allow | allow | disallow | inherit | disallow |
| `lockdown` | disallow | disallow | disallow | disallow | disallow |

Two presets also rule on a bot's training purpose, regardless of its group: `blockTraining`
blocks every bot with an `ai-training` category, `citationFriendly` only those whose *sole*
purpose is training. So `ClaudeBot`, which both answers prompts and collects training data, is
blocked by `blockTraining` and allowed by `citationFriendly`, while `GPTBot` is blocked by both.
Both rules read the registry's categories, so a bot added later is covered without touching the
preset.

**Crawlers missing from the registry** fall back to `User-agent: *`. For `seoOnly`,
`citationFriendly` and `blockTraining` that group stays permissive by design — blocking it would
shut out search engines the registry does not list, so those presets can only block what they
know. `lockdown` instead emits a blanket `Disallow: /` there and does not depend on registry
coverage.

Precedence, highest first: `bots`, then `groups`, then the preset.

## Bot registry

The registry (`defaultRegistry`, version `2026-10-24`) knows 64 crawlers. Each one falls into the
first group that matches it:

| Group | Bots | Examples |
| --- | --- | --- |
| `searchEngines` | 4 | Googlebot, Bingbot, DuckDuckBot, Applebot |
| `verifiedAi` | 46 | GPTBot, ClaudeBot, Claude-SearchBot, PerplexityBot, MistralAI-Index, GrokBot, DeepSeekBot, meta-externalagent |
| `unknownAi` | 8 | Diffbot, FirecrawlAgent, ImagesiftBot, Crawlspace |
| `seoScanners` | 4 | AhrefsBot, SemrushBot, MJ12bot, DotBot |
| `archives` | 2 | ia_archiver, archive.org_bot |

`defaultRegistry` lists every entry, `REGISTRY_VERSION` the ISO date of the last update.

Categories say what a bot is *for*, not who runs it, because the presets rule on them:

| Category | Meaning |
| --- | --- |
| `search` | Classic search engine index |
| `ai-search` | Builds an index an AI product answers from |
| `ai-input` | Fetches a page on demand for an assistant or agent |
| `ai-training` | Content may end up in a model's training set |
| `unknown-ai` | AI-adjacent, purpose not documented by the operator |
| `seo-scanner` | Backlink and SEO analysis |
| `archive` | Web archive |

`verified: false` marks bots whose operator publishes no crawler policy; `unknownAi` targets
exactly those.

Add your own with `extraBots`; each entry needs `id`, `provider`, `userAgents` and `categories`.

## Global rules inside bot groups

A crawler obeys only the most specific group that matches it ([RFC 9309](https://www.rfc-editor.org/rfc/rfc9309)).
So a bot with its own `Allow: /` block would ignore a `Disallow: /admin/` under `User-agent: *`.
The integration therefore repeats `allow`, `disallow` and `crawlDelay` inside every generated
**allow** block. Blocked bots keep a bare `Disallow: /`. Explicit `agents` blocks stay exactly as
written.

```ts
siteFiles({
  robots: { preset: 'seoOnly', disallow: ['/admin/'] },
})
```

Output, shortened (the full file has one block per registry bot):

```text
User-agent: *
Disallow: /admin/

User-agent: Googlebot
Allow: /
Disallow: /admin/

User-agent: Bingbot
Allow: /
Disallow: /admin/

User-agent: DuckDuckBot
Allow: /
Disallow: /admin/

User-agent: ia_archiver
Disallow: /

User-agent: GPTBot
Disallow: /

Sitemap: https://example.com/sitemap.xml
```

## Without a preset

```ts
siteFiles({
  robots: {
    disallow: ['/admin/', '/private/'],
    allow: ['/admin/public/'],
    crawlDelay: 2,
    agents: [{ userAgent: 'Googlebot', crawlDelay: 1 }],
  },
})
```

```text
User-agent: *
Allow: /admin/public/
Disallow: /admin/
Disallow: /private/
Crawl-delay: 2

User-agent: Googlebot
Crawl-delay: 1

Sitemap: https://example.com/sitemap.xml
```

## The Sitemap line

With `sitemap: true` the URL is `site` + `base` + the file the sitemap writer produced:
`sitemap.xml`, your `output.filename`, or `sitemap-index.xml` in index mode. See
[site URL and base path](../../guides/site-url-and-base/) for how `base` is applied.

`robots.txt` is a request, not enforcement. Crawlers that ignore it, or do not identify
themselves, are not stopped by it.
