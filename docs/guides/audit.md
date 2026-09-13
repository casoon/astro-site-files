---
title: Build-time audit
description: Fifteen checks that report configuration problems in the build log, and how to silence them.
order: 2
---

After writing each file, the integration checks its configuration and logs what it finds with a
rule ID, a level and a hint. The audit never fails the build; `error` findings are logged as
errors.

```text
[@casoon/astro-site-files] [security/no-policy] security.txt has no Policy field — Add a `policy` URL pointing to your security disclosure policy. This tells researchers how you handle reports.
```

That line is from this site's own build: its security.txt has no policy page.

## Rules

| Rule | Level | When |
| --- | --- | --- |
| `robots/legal-pages-blocked` | warn | A legal page (`/privacy`, `/terms`, `/impressum`, `/datenschutz`, `/agb`, `/imprint`, `/legal`) is in `disallow` |
| `llms/no-description` | info | No `description` |
| `llms/no-sections` | info | Neither `sections` nor `sources` |
| `llms/sections-without-links` | info | Sections without any `links`, and no `sources` |
| `security/contact-not-a-uri` | error | A `contact` value has no URI scheme |
| `security/no-expires` | warn | No `expires` |
| `security/invalid-expires` | error | `expires` is not a parseable date |
| `security/expired` | error | `expires` is in the past |
| `security/no-policy` | info | No `policy` |
| `humans/no-team` | info | No `team` entries |
| `humans/no-technology` | info | No `technology` entries |
| `sitemap/no-site-url` | warn | Neither `site` nor `sitemap.siteUrl`, so `<loc>` values are relative |
| `sitemap/empty-sitemap` | warn | No entries; off with `sitemap.audit.warnOnEmpty: false` |
| `sitemap/duplicate-urls` | warn | The same URL more than once (last one wins); `error` with `sitemap.audit.errorOnDuplicates` |
| `sitemap/invalid-priority` | warn | A priority outside `0` to `1` |

## Silencing rules

```ts
siteFiles({
  audit: { disable: ['security/no-policy', 'humans/no-team'] },
})
```

```ts
interface AuditOptions {
  /** false silences all hints. Default: true */
  enabled?: boolean
  /** Rule IDs to suppress */
  disable?: string[]
}
```

`audit: false` is the same as `audit: { enabled: false }`.

## Running the checks yourself

The audit functions are exported and return `AuditIssue[]`:

```ts
import { auditSecurity, filterIssues } from '@casoon/astro-site-files'

const issues = auditSecurity({ contact: 'security@example.com' })
// [{ level: 'error', rule: 'security/contact-not-a-uri', … },
//  { level: 'warn', rule: 'security/no-expires', … },
//  { level: 'info', rule: 'security/no-policy', … }]

filterIssues(issues, { disable: ['security/no-policy'] })
```
