---
title: Migrating from astro-crawler-policy
description: "Replace crawlerPolicy({ preset }) with siteFiles({ robots: { preset } }) in three steps, and what no longer exists."
order: 4
---

`@casoon/astro-crawler-policy` is archived. Its robots.txt and llms.txt features live on in this
package; the preset names are the same.

## Three steps

### 1. Swap the package

```sh
npm rm @casoon/astro-crawler-policy
npm install @casoon/astro-site-files
```

Node.js 22.12.0 and Astro 6 are required, see [installation](../../getting-started/installation/).

### 2. Move the config

```ts
// before
import crawlerPolicy from '@casoon/astro-crawler-policy'
export default defineConfig({
  integrations: [crawlerPolicy({ preset: 'citationFriendly' })],
})

// after
import siteFiles from '@casoon/astro-site-files'
export default defineConfig({
  site: 'https://example.com',
  integrations: [siteFiles({ robots: { preset: 'citationFriendly' } })],
})
```

The preset moves under `robots`. The `Sitemap:` line is derived from Astro's `site`, so set it.

### 3. Compare the output

Keep a copy of the old `dist/robots.txt`, build, and diff:

```sh
cp dist/robots.txt robots.old.txt
npx astro build
diff robots.old.txt dist/robots.txt
```

Expect more bot blocks (the registry is larger) and no `Content-Signal` line.

<Callout type="caution">
  `sitemap` is on by default, so the integration also writes `sitemap.xml`. If you generate one
  with `@astrojs/sitemap` as well, switch one of the two off, for example with
  `siteFiles({ sitemap: false })`.
</Callout>

## What is gone

| Before | Now |
| --- | --- |
| `Content-Signal` line | Not written, see [robots.txt](../../configuration/robots-txt/#why-no-content-signals) |
| Merge strategy `replace`, `prepend`, `append` with `public/robots.txt` | No merge option. The file is written to the build output after the build, so it replaces a `public/robots.txt`; move any hand-written rules into `disallow`, `allow` or `agents` |
| `env` option for per-environment overrides | Plain JavaScript in the Astro config, see [staging recipe](../../configuration/robots-txt/#staging-with-lockdown) |
