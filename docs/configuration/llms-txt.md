---
title: llms.txt
description: A Markdown summary of the site for language models, in the llmstxt.org format.
order: 2
---

Off by default. Written when `llms` is an object with a `title`. `llms: true` alone writes
nothing and logs a warning.

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

Link URLs are written as given. Use absolute URLs if the file is read outside the site; the
integration does not prefix `site` or `base` here.

## Example

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
          { title: 'Getting started', url: 'https://example.com/docs/start/', description: 'Setup guide' },
          { title: 'API reference', url: 'https://example.com/docs/api/' },
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
            url: `https://example.com/blog/${f.replace(/\.mdx?$/, '')}/`,
          })),
        }
      },
    ],
  },
})
```

`getCollection()` is not available in `astro:build:done`; read files directly.

## Audit hints

`llms/no-description`, `llms/no-sections` and `llms/sections-without-links` (all `info`). See
[build-time audit](../../guides/audit/).
