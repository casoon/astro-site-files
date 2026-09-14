---
title: API overview
sidebarLabel: API overview
description: Every export of the package at a glance. The declarations ship with the package; the source is on GitHub.
order: 1
---

The package is ESM only. Type declarations are included (`dist/index.d.ts`); there is no separate
API site. Package page: [npm](https://www.npmjs.com/package/@casoon/astro-site-files), source:
[src/](https://github.com/casoon/astro-site-files/tree/main/src).

## `@casoon/astro-site-files`

| Export | Kind | Purpose |
| --- | --- | --- |
| `default`, `siteFiles` | function | The Astro integration: `siteFiles(options?: SiteFilesOptions)` |
| `renderRobotsTxt` | function | `(options, siteUrl?, sitemapFilename?) => string` |
| `renderLlmsTxt` | function | `(options) => string`; `sources` are not resolved here |
| `renderSecurityTxt` | function | `(options) => string` |
| `renderHumansTxt` | function | `(options) => string` |
| `renderSitemapXml` | function | `(entries, comment?) => string` |
| `renderSitemapIndex` | function | Index file for chunked sitemaps |
| `resolveEntry` | function | `(entry, options, siteUrl) => ResolvedSitemapEntry`; applies rules and defaults |
| `deduplicateEntries` | function | Keeps the last entry per URL |
| `renderRssFeed` | function | `(options, siteUrl, items) => string` |
| `createRssRoute` | function | `GET` handler for an API route |
| `auditRobots`, `auditLlms`, `auditSecurity`, `auditHumans`, `auditSitemap` | function | Return `AuditIssue[]` |
| `filterIssues` | function | Applies `AuditOptions` to a list of issues |
| `defaultRegistry` | constant | The 25 built-in bots (`RegistryBot[]`) |
| `REGISTRY_VERSION` | constant | Date of the last registry update, currently `2026-05-27` |

## `@casoon/astro-site-files/rss`

| Export | Kind | Purpose |
| --- | --- | --- |
| `createRssRoute` | function | Same as above |
| `renderRssFeed` | function | Same as above |
| `CreateRssRouteOptions`, `RssItem` | types | Route options and feed items |

## Types

| Type | Used by |
| --- | --- |
| `SiteFilesOptions` | The integration: `robots`, `llms`, `sitemap`, `rss`, `security`, `humans`, `audit`, `debug` |
| `RobotsOptions`, `AgentRule`, `BotAction`, `BotCategory`, `RegistryBot`, `Preset` | [robots.txt](../../configuration/robots-txt/) |
| `LlmsOptions`, `LlmsSection`, `LlmsLink`, `LlmsSource` | [llms.txt](../../configuration/llms-txt/) |
| `SitemapOptions`, `SitemapEntry`, `ResolvedSitemapEntry`, `SitemapSource`, `PriorityRule`, `ChangefreqRule`, `I18nOptions`, `Changefreq` | [sitemap.xml](../../configuration/sitemap-xml/) |
| `RssConfig`, `RssItem` | [RSS feed](../../configuration/rss/) |
| `SecurityOptions` | [security.txt](../../configuration/security-txt/) |
| `HumansOptions`, `HumansTeamMember` | [humans.txt](../../configuration/humans-txt/) |
| `AuditIssue`, `AuditOptions` | [Build-time audit](../../guides/audit/) |

## Without Astro

The renderers are plain functions. They can write the same files from any build script:

```ts
import { renderRobotsTxt, renderSecurityTxt } from '@casoon/astro-site-files'

const robots = renderRobotsTxt({ preset: 'blockTraining', disallow: ['/admin/'] }, 'https://example.com')
const security = renderSecurityTxt({
  contact: 'mailto:security@example.com',
  expires: '2027-03-01T00:00:00.000Z',
})
```

`renderRobotsTxt` needs the site URL including any base path, and the sitemap file name if it is
not `sitemap.xml`; the integration passes both.
