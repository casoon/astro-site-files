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

Two presets also block single bots regardless of their group:

- `citationFriendly`: `GPTBot`, `Google-Extended`, `CCBot`, `Bytespider`, `Applebot-Extended`.
- `blockTraining`: the same five plus `ClaudeBot`, `anthropic-ai` and `meta-externalagent`.

Precedence, highest first: `bots`, then `groups`, then the preset.

## Bot registry

The registry (`defaultRegistry`, version `2026-05-27`) knows 25 crawlers:

| Group | Bots |
| --- | --- |
| `searchEngines` | Googlebot, Bingbot, DuckDuckBot |
| `verifiedAi` | GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-Web, anthropic-ai, Google-Extended, CCBot, PerplexityBot, YouBot, Bytespider, meta-externalagent, Amazonbot, Applebot-Extended |
| `unknownAi` | Diffbot, Omgilibot |
| `seoScanners` | AhrefsBot, SemrushBot, MJ12bot, DotBot |
| `archives` | ia_archiver, archive.org_bot |

Add your own with `extraBots`; each entry needs `id`, `provider`, `userAgents` and `categories`
(`search`, `ai-search`, `ai-input`, `ai-training`, `unknown-ai`, `seo-scanner`, `archive`).

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
