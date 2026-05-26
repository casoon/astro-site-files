# @casoon/astro-site-files

Astro integration that generates all standard site meta-files from typed configuration at build time.

## What it does

- Generates `robots.txt` — crawl rules with per-agent overrides and automatic sitemap reference
- Generates `llms.txt` — AI model discovery file following the [llmstxt.org](https://llmstxt.org) specification
- Generates `sitemap.xml` — built-in, enabled by default, with i18n hreflang and sitemap-index support
- Generates `/.well-known/security.txt` — vulnerability disclosure contact per [RFC 9116](https://www.rfc-editor.org/rfc/rfc9116)
- Generates `humans.txt` — team and technology credits per [humanstxt.org](https://humanstxt.org)

All files are written to the build output directory when `astro build` runs.

> **Successor package.** This integration replaces [@casoon/astro-crawler-policy](https://github.com/casoon/astro-crawler-policy) (robots.txt + llms.txt) and [@casoon/astro-sitemap](https://github.com/casoon/astro-sitemap) (sitemap.xml). Both predecessor packages are no longer actively maintained.

## Requirements

- Node.js **≥ 22.12.0** (aligned with Astro 6)
- Astro **≥ 6.0.0** (peer dependency, optional for programmatic usage)

## Installation

```sh
npm install @casoon/astro-site-files
```

## Quick start

```ts
// astro.config.ts
import { defineConfig } from 'astro/config'
import siteFiles from '@casoon/astro-site-files'

export default defineConfig({
  site: 'https://example.com',
  integrations: [
    siteFiles({
      robots: { disallow: ['/admin'] },
      llms: { title: 'Example', description: 'An example website.' },
      security: { contact: 'mailto:info@casoon.de' },
      humans: {
        team: [{ name: 'Alice', role: 'Development' }],
        technology: ['Astro', 'TypeScript']
      }
    })
  ]
})
```

`robots.txt` and `sitemap.xml` are enabled by default. The other three files are generated only when their option is configured.

## robots.txt

```ts
siteFiles({
  robots: {
    disallow: ['/admin', '/private/'],
    allow: ['/admin/public/'],
    crawlDelay: 2,
    sitemap: true,           // auto-derive from astro.config site URL (default)
    agents: [
      {
        userAgent: 'Googlebot',
        crawlDelay: 1
      }
    ]
  }
})
```

**Option reference:**

| Option | Type | Default | Description |
|---|---|---|---|
| `disallow` | `string[]` | `[]` | Paths to disallow for `User-agent: *` |
| `allow` | `string[]` | `[]` | Paths to explicitly allow for `User-agent: *` |
| `crawlDelay` | `number` | — | Crawl-delay for `User-agent: *` |
| `sitemap` | `boolean \| string` | `true` | `true` = derive URL from `astro.config.site`, `string` = explicit URL, `false` = omit |
| `agents` | `AgentRule[]` | `[]` | Additional per-agent rule blocks |

Each entry in `agents`:

| Field | Type | Description |
|---|---|---|
| `userAgent` | `string \| string[]` | User-agent value(s) |
| `allow` | `string[]` | Paths to allow |
| `disallow` | `string[]` | Paths to disallow |
| `crawlDelay` | `number` | Crawl-delay for this agent |

**Disable:** `robots: false`

**Generated output:**

```
User-agent: *
Disallow: /admin
Disallow: /private/
Allow: /admin/public/
Crawl-delay: 2

User-agent: Googlebot
Crawl-delay: 1

Sitemap: https://example.com/sitemap.xml
```

## llms.txt

Follows the [llmstxt.org](https://llmstxt.org) specification. Provides structured metadata for AI models discovering what your site is about.

```ts
siteFiles({
  llms: {
    title: 'Example',
    description: 'An example website focused on TypeScript tooling.',
    details: 'This site documents internal tools and workflows.',
    sections: [
      {
        title: 'Documentation',
        links: [
          { title: 'Getting started', url: '/docs/start', description: 'Setup guide' },
          { title: 'API reference', url: '/docs/api' }
        ]
      }
    ]
  }
})
```

Use `sources` to generate sections from code — for example from a content collection — instead of maintaining them manually:

```ts
siteFiles({
  llms: {
    title: 'Example',
    description: 'An example website.',
    sources: [
      async () => {
        const posts = await getCollection('blog')
        return {
          title: 'Blog',
          links: posts.map(p => ({ title: p.data.title, url: `/blog/${p.id}/` })),
        }
      },
    ],
  },
})
```

Sections from `sources` are appended after any manually defined `sections`.

**Option reference:**

| Option | Type | Description |
|---|---|---|
| `title` | `string` | **Required.** Site or project name |
| `description` | `string` | Short description rendered as a blockquote |
| `details` | `string` | Additional plain-text context |
| `sections` | `LlmsSection[]` | Named sections with link lists (static) |
| `sources` | `LlmsSource[]` | Async functions that return additional sections |

Each entry in `sections`:

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Section heading |
| `links` | `Link[]` | Optional list of links |

Each entry in `links`:

| Field | Type | Description |
|---|---|---|
| `title` | `string` | Link label |
| `url` | `string` | Absolute or relative URL |
| `description` | `string` | Optional inline description after the link |

**Disable:** Omit the option or set `llms: false`

**Generated output:**

```md
# Example

> An example website focused on TypeScript tooling.

This site documents internal tools and workflows.

## Documentation

- [Getting started](/docs/start): Setup guide
- [API reference](/docs/api)
```

## sitemap.xml

Sitemap generation is built-in and enabled by default. Static pages are discovered automatically from Astro's build output. Dynamic URLs can be added via `sources`.

```ts
siteFiles({
  sitemap: {
    exclude: ['/landing/'],
    priority: [{ pattern: '/blog/', priority: 0.9 }],
    sources: [
      async () => {
        const posts = await getCollection('blog')
        return posts.map(p => ({ loc: `/blog/${p.id}/`, lastmod: p.data.date }))
      }
    ]
  }
})
```

**Option reference:**

| Option | Type | Description |
|---|---|---|
| `siteUrl` | `string` | Override the site URL (auto-detected from `astro.config.site`) |
| `sources` | `SitemapSource[]` | Async functions returning additional `SitemapEntry[]` |
| `exclude` | `(string \| RegExp)[]` | URL paths or patterns to exclude |
| `filter` | `(url: string) => boolean` | Custom filter on the full absolute URL |
| `priority` | `PriorityRule[]` | Pattern-based priority overrides (first match wins) |
| `changefreq` | `ChangefreqRule[]` | Pattern-based changefreq overrides (first match wins) |
| `serialize` | `(entry) => entry \| undefined` | Per-item transform or filter hook |
| `i18n` | `{ defaultLocale, locales }` | Generates `<xhtml:link rel="alternate">` hreflang entries |
| `output.mode` | `'single' \| 'index'` | `index` splits into numbered chunks (auto when > `maxUrls`). In index mode the index file is always `sitemap-index.xml` and chunks are `sitemap-1.xml`, `sitemap-2.xml`, … |
| `output.maxUrls` | `number` | Max URLs per file in index mode — default `50 000` |
| `output.filename` | `string` | Output filename in single-file mode — default `sitemap.xml`. Ignored in index mode. |
| `audit.warnOnEmpty` | `boolean` | Warn when sitemap has zero entries — default `true` |
| `audit.errorOnDuplicates` | `boolean` | Emit error instead of warning for duplicate URLs — default `false` |

**Built-in exclusions** (always applied): `/404`, `/500`, `/_*`, `/api/`, `/landing/`, `/drafts/`, `sitemap.xml`, `robots.txt`, `llms.txt`, `rss.xml`.

**Built-in priority defaults:** `/` → 1.0, depth 1 → 0.9, depth 2 → 0.8, depth 3+ → 0.7

**Built-in changefreq defaults:** `/` and content paths (`/blog/`, `/artikel/`, etc.) → `weekly`, everything else → `monthly`

**Disable:** `sitemap: false`

## security.txt

Generated at `/.well-known/security.txt` per [RFC 9116](https://www.rfc-editor.org/rfc/rfc9116). The `contact` field is required by the specification.

```ts
siteFiles({
  security: {
    contact: 'mailto:info@casoon.de',
    policy: 'https://www.casoon.de/security-policy',
    acknowledgments: 'https://www.casoon.de/hall-of-fame',
    preferredLanguages: ['en', 'de'],
    expires: '2027-01-01T00:00:00.000Z',
    hiring: 'https://www.casoon.de/jobs'
  }
})
```

**Option reference:**

| Option | Type | Description |
|---|---|---|
| `contact` | `string \| string[]` | **Required.** `mailto:` or `https:` URI for reporting vulnerabilities |
| `policy` | `string` | URL of the security policy |
| `acknowledgments` | `string` | URL of the acknowledgments or hall-of-fame page |
| `preferredLanguages` | `string[]` | BCP 47 language tags, e.g. `['en', 'de']` |
| `expires` | `string \| Date` | ISO 8601 expiry date — when to renew the file |
| `encryption` | `string` | URL of the PGP public key |
| `canonical` | `string` | Canonical URL of this `security.txt` file |
| `hiring` | `string` | URL of a security-focused jobs page |

**Disable:** Omit the option or set `security: false`

**Generated output:**

```
Contact: mailto:info@casoon.de
Expires: 2027-01-01T00:00:00.000Z
Acknowledgments: https://www.casoon.de/hall-of-fame
Preferred-Languages: en, de
Policy: https://www.casoon.de/security-policy
Hiring: https://www.casoon.de/jobs
```

## humans.txt

Follows the [humanstxt.org](https://humanstxt.org) convention.

```ts
siteFiles({
  humans: {
    team: [
      { name: 'Alice', role: 'Development', location: 'Berlin' },
      { name: 'Bob', role: 'Design', twitter: '@bob' }
    ],
    thanks: ['Open Source Community', 'Our early users'],
    technology: ['Astro', 'TypeScript', 'Tailwind CSS'],
    note: 'Built with care.'
  }
})
```

**Option reference:**

| Option | Type | Description |
|---|---|---|
| `team` | `TeamMember[]` | List of team members |
| `thanks` | `string[]` | Acknowledgment entries |
| `technology` | `string[]` | Technologies used — rendered as a comma-separated list |
| `note` | `string` | Free-form note |
| `lastUpdate` | `string \| Date` | Defaults to the build date |

Each entry in `team`:

| Field | Type | Description |
|---|---|---|
| `name` | `string` | **Required.** Full name |
| `role` | `string` | Job title or role |
| `twitter` | `string` | Twitter / X handle |
| `location` | `string` | City or country |
| `email` | `string` | Contact email |

**Disable:** Omit the option or set `humans: false`

**Generated output:**

```
/* TEAM */
    Name: Alice
    Role: Development
    Location: Berlin

/* SITE LAST UPDATED */
    2026-05-06

/* TECHNOLOGY COLOPHON */
    Astro, TypeScript, Tailwind CSS
```

## Build-time audit hints

The integration emits build-time hints when configuration looks incomplete or incorrect. Each hint has a rule ID, a level (`info` / `warn`), and a help message.

**All rule IDs:**

| Rule ID | Level | Triggered when |
|---|---|---|
| `robots/legal-pages-blocked` | warn | A legal page (`/privacy`, `/terms`, `/impressum`, …) is in `disallow` |
| `llms/no-description` | info | `llms` has no `description` |
| `llms/no-sections` | info | `llms` has no `sections` or `sources` |
| `llms/sections-without-links` | info | Sections exist but none have `links` (and no `sources` configured) |
| `security/no-expires` | warn | `security` has no `expires` date (required by RFC 9116) |
| `security/no-policy` | info | `security` has no `policy` URL |
| `humans/no-team` | info | `humans` has no `team` entries |
| `humans/no-technology` | info | `humans` has no `technology` entries |
| `sitemap/no-site-url` | warn | No site URL is configured — `<loc>` entries will be relative |
| `sitemap/empty-sitemap` | warn | Sitemap has no entries after all sources are resolved |
| `sitemap/duplicate-urls` | warn/error | Duplicate URLs detected before deduplication (last wins) |
| `sitemap/invalid-priority` | warn | One or more entries have `priority` outside `[0, 1]` |

**Disable all hints:**

```ts
siteFiles({ audit: false })
```

**Suppress specific rules:**

```ts
siteFiles({
  audit: {
    disable: [
      'llms/no-description',
      'security/no-expires',
    ],
  },
})
```

**`audit` option reference:**

| Option | Type | Description |
|---|---|---|
| `enabled` | `boolean` | Set to `false` to silence all hints |
| `disable` | `string[]` | Rule IDs to suppress individually |

Passing `audit: false` is equivalent to `audit: { enabled: false }`.

## Option defaults

| Option | Default behavior |
|---|---|
| `robots` | Enabled — generates `robots.txt` with `Disallow:` (allow all) |
| `llms` | Disabled — requires `{ title }` |
| `sitemap` | Enabled — built-in sitemap generation from Astro's build output |
| `security` | Disabled — requires `{ contact }` |
| `humans` | Disabled — generates when any option is provided |
| `audit` | Enabled — emits build-time hints for all generated files |

## Programmatic usage

The renderer functions are exported for use outside of the Astro integration:

```ts
import {
  renderRobotsTxt,
  renderLlmsTxt,
  renderSecurityTxt,
  renderHumansTxt,
  renderSitemapXml,
  renderSitemapIndex,
  resolveEntry,
  deduplicateEntries,
  auditSitemap,
  auditRobots,
  auditLlms,
  auditSecurity,
  auditHumans,
  filterIssues,
} from '@casoon/astro-site-files'
import type { AuditOptions, AuditIssue } from '@casoon/astro-site-files'

const robots = renderRobotsTxt({ disallow: ['/admin'] }, 'https://example.com')
const llms = renderLlmsTxt({ title: 'My Site', description: 'A site.' })
const security = renderSecurityTxt({ contact: 'mailto:info@casoon.de' })
const humans = renderHumansTxt({ team: [{ name: 'Alice' }], technology: ['Astro'] })

const entries = [{ loc: '/blog/post/' }].map(e => resolveEntry(e, {}, 'https://example.com'))
const xml = renderSitemapXml(deduplicateEntries(entries))
```

---

> This package covers static file generation. Actual crawl enforcement depends on whether bots respect these files — many do not.
