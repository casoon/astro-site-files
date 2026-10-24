---
title: Quickstart
description: From an empty config to five generated files in one build.
order: 2
---

## 1. Set `site`

Every absolute URL the integration writes comes from Astro's `site` option: the `Sitemap:` line in
`robots.txt`, each `<loc>` in `sitemap.xml`, the links in `rss.xml` and the relative link URLs in
`llms.txt`. Without it the sitemap contains relative paths (`sitemap/no-site-url` in the build log)
and the llms.txt links stay relative (`llms/relative-links`), which leaves them unusable for a
reader that fetched the file on its own.

`site` is the host; a subpath belongs in `base`, which the integration appends itself — see
[Site URL and base path](../../guides/site-url-and-base/).

## 2. Add the integration

```ts
// astro.config.ts
import { defineConfig } from 'astro/config'
import siteFiles from '@casoon/astro-site-files'

export default defineConfig({
  site: 'https://example.com',
  integrations: [
    siteFiles({
      robots: { preset: 'seoOnly', disallow: ['/admin/'] },
      llms: { title: 'Example', description: 'An example website.' },
      security: {
        contact: 'mailto:security@example.com',
        expires: '2027-03-01T00:00:00.000Z',
      },
      humans: {
        team: [{ name: 'Alice', role: 'Development' }],
        technology: ['Astro', 'TypeScript'],
      },
    }),
  ],
})
```

`robots` and `sitemap` are on by default, so `siteFiles()` without options already writes
`robots.txt` and `sitemap.xml`. `llms`, `security` and `humans` are written only when configured.

## 3. Build

```sh
npx astro build
```

The integration logs each file it writes. From this site's own build:

```text
[@casoon/astro-site-files] sitemap: 1 path(s) excluded by built-in rules: /404/
[@casoon/astro-site-files] sitemap.xml generated (20 URLs)
[@casoon/astro-site-files] robots.txt generated
[@casoon/astro-site-files] llms.txt generated
[@casoon/astro-site-files] .well-known/security.txt generated
[@casoon/astro-site-files] humans.txt generated
```

The files land in `dist/`: `robots.txt`, `sitemap.xml`, `llms.txt`, `humans.txt` and
`.well-known/security.txt`. Hints from the [build-time audit](../../guides/audit/) appear in the
same log.

## Keep the config in its own module

Every option has an exported type, so the configuration can live in a separate, type-checked
file. This site does exactly that:

```ts
// src/site-files.ts
import type { RobotsOptions, SiteFilesOptions } from '@casoon/astro-site-files'

export const robots: RobotsOptions = { preset: 'citationFriendly' }

export const siteFilesOptions: SiteFilesOptions = { robots }
```

```js
// astro.config.mjs
import siteFiles from '@casoon/astro-site-files'
import { siteFilesOptions } from './src/site-files.ts'

export default defineConfig({
  site: 'https://casoon.github.io',
  base: '/astro-site-files/',
  integrations: [siteFiles(siteFilesOptions)],
})
```

Next: the options of each file under **Configuration**, starting with
[robots.txt](../../configuration/robots-txt/).
