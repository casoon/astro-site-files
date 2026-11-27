# @casoon/astro-site-files

Astro integration that writes the files search engines, AI assistants and security researchers
look for (`robots.txt`, `sitemap.xml`, `llms.txt` and `llms-full.txt`, `rss.xml`, `security.txt`
and `humans.txt`)
into the build output, from one typed configuration.

**Documentation:** [casoon.github.io/astro-site-files](https://casoon.github.io/astro-site-files/) ·
**npm:** [@casoon/astro-site-files](https://www.npmjs.com/package/@casoon/astro-site-files) ·
**Changelog:** [CHANGELOG.md](CHANGELOG.md)

## What it generates

| File | Option | Default |
| --- | --- | --- |
| `robots.txt` | `robots` | on: crawl rules from a preset, per-bot overrides, `Sitemap:` line |
| `sitemap.xml` | `sitemap` | on: every built page, hreflang alternates, sitemap index for large sites |
| `llms.txt` | `llms` | off, needs `title`: summary and links in the [llmstxt.org](https://llmstxt.org) format |
| `llms-full.txt` | `llms.full` | off: the full Markdown of the pages you pass, under the `llms.txt` header |
| `rss.xml` | `rss` | off, needs `title`, `description`, `getItems`: RSS 2.0 feed |
| `.well-known/security.txt` | `security` | off, needs `contact`: disclosure contact per [RFC 9116](https://www.rfc-editor.org/rfc/rfc9116) |
| `humans.txt` | `humans` | off: team and technology per [humanstxt.org](https://humanstxt.org) |

All files are written in Astro's `astro:build:done` hook, after the pages exist. The sitemap lists
exactly the pages that were built, and an audit reports problems in the build log, such as an
expired `security.txt` or legal pages blocked in `robots.txt`. The package has no runtime
dependencies.

## Requirements

- Node.js **≥ 22.12.0**
- Astro **≥ 6.0.0**, Astro 7 included (optional peer dependency; the renderer functions work without it)

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
      robots: { preset: 'citationFriendly', disallow: ['/admin/'] },
      llms: { title: 'Example', description: 'An example website.' },
      security: { contact: 'mailto:security@example.com', expires: '2027-03-01T00:00:00.000Z' },
      humans: { team: [{ name: 'Alice', role: 'Development' }], technology: ['Astro', 'TypeScript'] },
    }),
  ],
})
```

Run `astro build`; the files are in `dist/`.

## Choosing a robots.txt preset

A preset turns one decision into a rule for each of the crawlers in the built-in registry. Single
bots (`bots`) and whole groups (`groups`) can be overridden on top.

| Preset | Search engines | AI search and live answers | Answers + training (`ClaudeBot`, `Google-Extended`) | Training only (`GPTBot`, `CCBot`) | Archives |
| --- | --- | --- | --- | --- | --- |
| `seoOnly` | allowed | blocked | blocked | blocked | blocked |
| `blockTraining` | allowed | allowed | blocked | blocked | blocked |
| `citationFriendly` | allowed | allowed | allowed | blocked | allowed |
| `openToAi` | allowed | allowed | allowed | allowed | allowed |
| `lockdown` | blocked | blocked | blocked | blocked | blocked |

`Google-Extended` decides whether the Gemini app may cite the site, so blocking it costs
visibility there; Google Search and AI Overviews follow `Googlebot`. Which preset fits which
goal, and what `robots.txt` cannot enforce:
[AI crawlers, citations and training](https://casoon.github.io/astro-site-files/docs/guides/ai-crawlers/).

## Documentation

- [Quickstart](https://casoon.github.io/astro-site-files/docs/getting-started/quickstart/)
- Configuration: [robots.txt](https://casoon.github.io/astro-site-files/docs/configuration/robots-txt/) ·
  [llms.txt](https://casoon.github.io/astro-site-files/docs/configuration/llms-txt/) ·
  [sitemap.xml](https://casoon.github.io/astro-site-files/docs/configuration/sitemap-xml/) ·
  [RSS feed](https://casoon.github.io/astro-site-files/docs/configuration/rss/) ·
  [security.txt](https://casoon.github.io/astro-site-files/docs/configuration/security-txt/) ·
  [humans.txt](https://casoon.github.io/astro-site-files/docs/configuration/humans-txt/)
- Guides: [site URL and base path](https://casoon.github.io/astro-site-files/docs/guides/site-url-and-base/) ·
  [build-time audit](https://casoon.github.io/astro-site-files/docs/guides/audit/) ·
  [migrating from astro-crawler-policy](https://casoon.github.io/astro-site-files/docs/guides/migrate-from-crawler-policy/)
- [API overview](https://casoon.github.io/astro-site-files/docs/reference/api/): renderer
  functions (`renderRobotsTxt`, `renderSitemapXml` …), audit functions, the bot registry and
  `createRssRoute` for a feed served from an API route.

## Predecessors

This package replaces [@casoon/astro-crawler-policy](https://github.com/casoon/astro-crawler-policy)
(robots.txt, llms.txt) and [@casoon/astro-sitemap](https://github.com/casoon/astro-sitemap)
(sitemap.xml, rss.xml); neither is actively maintained.

## License

MIT
