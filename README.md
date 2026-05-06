# @casoon/astro-site-files

Astro integration that generates all standard site meta-files from typed configuration at build time.

## What it does

- Generates `robots.txt` — crawl rules with per-agent overrides and automatic sitemap reference
- Generates `llms.txt` — AI model discovery file following the [llmstxt.org](https://llmstxt.org) specification
- Generates `sitemap.xml` — via [@casoon/astro-sitemap](https://github.com/casoon/astro-sitemap) (enabled by default)
- Generates `/.well-known/security.txt` — vulnerability disclosure contact per [RFC 9116](https://www.rfc-editor.org/rfc/rfc9116)
- Generates `humans.txt` — team and technology credits per [humanstxt.org](https://humanstxt.org)

All files are written to the build output directory when `astro build` runs.

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
      security: { contact: 'mailto:security@example.com' },
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

**Option reference:**

| Option | Type | Description |
|---|---|---|
| `title` | `string` | **Required.** Site or project name |
| `description` | `string` | Short description rendered as a blockquote |
| `details` | `string` | Additional plain-text context |
| `sections` | `Section[]` | Named sections with link lists |

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

Sitemap generation is handled by [@casoon/astro-sitemap](https://github.com/casoon/astro-sitemap) and enabled by default. Pass any `@casoon/astro-sitemap` options directly:

```ts
siteFiles({
  sitemap: {
    exclude: ['/landing/'],
    priority: [{ pattern: '/blog/', value: 0.9 }]
  }
})
```

**Disable:** `sitemap: false`

See the [@casoon/astro-sitemap documentation](https://github.com/casoon/astro-sitemap) for the full option reference.

## security.txt

Generated at `/.well-known/security.txt` per [RFC 9116](https://www.rfc-editor.org/rfc/rfc9116). The `contact` field is required by the specification.

```ts
siteFiles({
  security: {
    contact: 'mailto:security@example.com',
    policy: 'https://example.com/security-policy',
    acknowledgments: 'https://example.com/hall-of-fame',
    preferredLanguages: ['en', 'de'],
    expires: '2027-01-01T00:00:00.000Z',
    hiring: 'https://example.com/jobs'
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
Contact: mailto:security@example.com
Expires: 2027-01-01T00:00:00.000Z
Acknowledgments: https://example.com/hall-of-fame
Preferred-Languages: en, de
Policy: https://example.com/security-policy
Hiring: https://example.com/jobs
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

## Option defaults

| Option | Default behavior |
|---|---|
| `robots` | Enabled — generates `robots.txt` with `Disallow:` (allow all) |
| `llms` | Disabled — requires `{ title }` |
| `sitemap` | Enabled — delegates to `@casoon/astro-sitemap` |
| `security` | Disabled — requires `{ contact }` |
| `humans` | Disabled — generates when any option is provided |

## Programmatic usage

The renderer functions are exported for use outside of the Astro integration:

```ts
import {
  renderRobotsTxt,
  renderLlmsTxt,
  renderSecurityTxt,
  renderHumansTxt
} from '@casoon/astro-site-files'

const robots = renderRobotsTxt({ disallow: ['/admin'] }, 'https://example.com')
const llms = renderLlmsTxt({ title: 'My Site', description: 'A site.' })
const security = renderSecurityTxt({ contact: 'mailto:security@example.com' })
const humans = renderHumansTxt({ team: [{ name: 'Alice' }], technology: ['Astro'] })
```

---

> This package covers static file generation. Actual crawl enforcement depends on whether bots respect these files — many do not.
