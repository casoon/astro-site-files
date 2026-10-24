---
title: llms.txt
description: A Markdown summary of the site for language models, in the llmstxt.org format.
order: 2
---

Off by default. Written when `llms` is an object with a `title`. `llms: true` alone writes
nothing and logs a warning.

## What reads it

`llms.txt` is a convention from [llmstxt.org](https://llmstxt.org/): one Markdown file at the host
root that states what a site is about and which of its pages matter, so a language model does not
have to crawl the site and strip HTML to find out. It is a convention, not a standard — no crawler
is obliged to fetch it and nothing enforces the format.

That decides what belongs in it. The sitemap lists every page, for a crawler that walks the whole
site; `llms.txt` is the short answer for a reader that fetches one file and stops. Name the pages a
person would point someone at — services, contact, legal pages, the main articles — and leave the
long tail to the sitemap.

## Options

```ts
interface LlmsOptions {
  title: string
  description?: string
  details?: string
  sections?: LlmsSection[]
  /** Async functions that return additional sections, merged after `sections` */
  sources?: LlmsSource[]
}

interface LlmsSection {
  title: string
  links?: LlmsLink[]
}

interface LlmsLink {
  title: string
  url: string
  description?: string
}

type LlmsSource = () => LlmsSection | Promise<LlmsSection>
```

| Option | Rendered as |
| --- | --- |
| `title` | `# title` |
| `description` | A blockquote under the title |
| `details` | A plain paragraph |
| `sections` | `## title` with a list of `[title](url): description` |
| `sources` | Sections from code, appended after `sections` |

## Where the link URLs come from

The file is fetched on its own and read as text, so there is no page it was linked from. A
relative URL like `/lohnmosterei/` has nothing to resolve against: it only works for a reader that
already knows the host. The integration therefore puts the site URL in front of relative link
URLs, the way the sitemap builds its `<loc>` values:

| Configured `url` | `site` and `base` | Written to `llms.txt` |
| --- | --- | --- |
| `/lohnmosterei/` | `https://example.com` | `https://example.com/lohnmosterei/` |
| `/docs/` | `https://example.com`, base `/app/` | `https://example.com/app/docs/` |
| `https://other.example/x` | any | `https://other.example/x` |
| `mailto:info@example.com` | any | `mailto:info@example.com` |

These links point at content, like the sitemap's entries, so `sitemap.siteUrl` replaces Astro's
`site` here as well and `base` is appended — see
[Site URL and base path](../../guides/site-url-and-base/). A URL that already carries a scheme
(`https:`, `mailto:`, `tel:`) or starts with `//` is written exactly as configured.

With neither `site` nor `sitemap.siteUrl` set there is nothing to put in front. The link is then
written as configured and the audit reports `llms/relative-links` (`warn`) listing the URLs it
affects. The file still builds — its links just stay unusable outside the site.

## Example

With `site: 'https://example.com'` in the Astro config, the links can be written as paths:

```ts
siteFiles({
  llms: {
    title: 'Example',
    description: 'An example website about TypeScript tooling.',
    details: 'Documentation for internal tools and workflows.',
    sections: [
      {
        title: 'Documentation',
        links: [
          { title: 'Getting started', url: '/docs/start/', description: 'Setup guide' },
          { title: 'API reference', url: '/docs/api/' },
        ],
      },
    ],
  },
})
```

```md
# Example

> An example website about TypeScript tooling.

Documentation for internal tools and workflows.

## Documentation

- [Getting started](https://example.com/docs/start/): Setup guide
- [API reference](https://example.com/docs/api/)
```

## Sections from code

`sources` run once, in `astro:build:done`. Each returns one section:

```ts
import { readdir } from 'node:fs/promises'

siteFiles({
  llms: {
    title: 'Example',
    sources: [
      async () => {
        const files = await readdir('./src/content/blog')
        return {
          title: 'Blog',
          links: files.map((f) => ({
            title: f.replace(/\.mdx?$/, ''),
            url: `/blog/${f.replace(/\.mdx?$/, '')}/`,
          })),
        }
      },
    ],
  },
})
```

`getCollection()` is not available in `astro:build:done`; read files directly. Links from
`sources` are resolved against the site URL like the ones in `sections`.

## Audit hints

`llms/no-description`, `llms/no-sections` and `llms/sections-without-links` (all `info`), plus
`llms/relative-links` (`warn`). See [build-time audit](../../guides/audit/).
