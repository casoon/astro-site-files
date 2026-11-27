---
title: AI crawlers, citations and training
sidebarLabel: AI crawlers
description: What each robots.txt preset means for live AI answers, Gemini, model training and archives, and what robots.txt cannot do.
order: 2
---

AI products reach a site in three different ways, and `robots.txt` can steer each one separately:

| Way in | Typical crawlers | What blocking it costs you |
| --- | --- | --- |
| Live answers and AI search | `OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`, `PerplexityBot` | The assistant cannot read or cite the page when a user asks |
| Answers and training in one token | `ClaudeBot`, `Google-Extended`, `meta-externalagent` | Both: no citations from that product, no training |
| Training only | `GPTBot`, `CCBot`, `Applebot-Extended` | The content stays out of future models' general knowledge |

The registry records this as categories (`ai-search`, `ai-input`, `ai-training`) on every bot,
and the presets decide on those categories, see [robots.txt](../../configuration/robots-txt/#presets).

## Pick a preset by goal

- **Be cited, keep content out of training data:** `citationFriendly`. Every crawler that answers
  prompts or builds an AI search index is allowed, crawlers whose only purpose is training are
  blocked.
- **Be as visible as possible, including in what models know without a web search:** `openToAi`,
  usually with `groups: { unknownAi: 'disallow' }` so crawlers whose operator publishes no crawler
  policy stay out.
- **No training under any token:** `blockTraining`. This also blocks the dual-purpose tokens, so
  Claude and the Gemini app lose access to the site for answers as well.
- **Search engines only:** `seoOnly`.

```ts
siteFiles({
  robots: { preset: 'openToAi', groups: { unknownAi: 'disallow' } },
})
```

Single bots can be overridden on top of any preset: `bots: { CCBot: 'disallow' }`.

## Google: three separate controls

- **Google Search, AI Overviews and AI Mode** use what `Googlebot` crawls. They are governed by the
  Search generative AI setting in Google Search Console, not by `robots.txt` tokens.
- **The Gemini app and Google's model training** follow `Google-Extended`. Google treats a site that
  disallows it as not eligible for grounding in the Gemini app, so its pages are not cited there.
  `Google-Extended` is a control token, not a crawler of its own.
- Blocking `Google-Extended` has no effect on ranking or inclusion in Google Search.

## Common Crawl

`CCBot` builds the Common Crawl dataset. Many models, open-weight ones included, are trained on
data derived from it rather than on their own crawl. Blocking only `GPTBot` while `CCBot` stays
open therefore still lets the content reach training pipelines; allowing `CCBot` is the widest way
into training data. Every preset except `openToAi` blocks it.

## Archives and caches

`ia_archiver` and `archive.org_bot` feed the Wayback Machine. `seoOnly` and `blockTraining` block
them; with `citationFriendly` they fall back to `User-agent: *`. Search engine snapshots are
controlled per page instead:

```html
<meta name="robots" content="noarchive">
```

```text
X-Robots-Tag: noarchive
```

## SEO scanners

`AhrefsBot`, `SemrushBot`, `MJ12bot` and `DotBot` are left to `User-agent: *` by every preset
except `lockdown`. Blocking them with `groups: { seoScanners: 'disallow' }` keeps competitors
from analysing the site with those tools, and keeps you from using them on your own site.

## What robots.txt cannot do

`robots.txt` is a request. Crawlers that do not identify themselves (residential IPs, headless
browsers with ordinary headers, distributed requests) are not stopped by it. Enforcement needs
infrastructure: rate limiting, bot detection, JavaScript challenges, IP reputation or a login.
On Cloudflare, a WAF rule can challenge unverified bots while letting search engine crawlers
through:

```text
(cf.client.bot and not cf.verified_bot_category in {"Search Engine Crawler"})
→ Challenge / JS Challenge / Block
```
