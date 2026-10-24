---
title: Site URL and base path
description: Which origin each generated file uses, why robots.txt is the exception, and what a subpath deployment means for crawlers.
order: 1
---

## Where the URLs come from

The integration builds its absolute URLs from Astro's own options — `site` is the host, `base` the
path below it:

| File | The URL in it | Origin it uses |
| --- | --- | --- |
| `robots.txt` | the `Sitemap:` line | `site` + `base`; `sitemap.siteUrl` only when `site` is unset |
| `sitemap.xml` | every `<loc>` | `sitemap.siteUrl`, else `site`, + `base` |
| `rss.xml` | feed URL and item links | `sitemap.siteUrl`, else `site`, + `base` |
| `llms.txt` | relative link URLs in `sections` and `sources` | `sitemap.siteUrl`, else `site`, + `base` |
| `security.txt`, `humans.txt` | every value | written exactly as configured |

A relative URL in `llms.txt` is left as configured when no site URL is set, and the audit reports
`llms/relative-links`. The sitemap falls back to relative `<loc>` values and reports
`sitemap/no-site-url`. A relative `Sitemap:` line is not valid, so robots.txt then omits it.

## Why robots.txt is the exception

Most of these URLs point at content: a crawler follows them to read pages, so they have to name
the origin on which that content is canonical. `sitemap.siteUrl` exists for the case where that
origin is not the one being built — a preview or project-page deployment whose pages live on the
production domain.

The `Sitemap:` line is a different kind of URL. It points at a file sitting next to the robots.txt
itself, which a crawler reads at `https://host/robots.txt` and expects to find on that same host.
Astro's `site` therefore wins there, and `sitemap.siteUrl` is used only when `site` is unset.
`robots.sitemap` as a string replaces the whole Sitemap URL for anything these rules do not cover.

## Two origins at once

```js
export default defineConfig({
  // where this build is served from
  site: 'https://preview.example.com',
  integrations: [
    siteFiles({
      // where the pages are canonical
      sitemap: { siteUrl: 'https://example.com' },
      llms: { title: 'Example', sections: [{ title: 'Pages', links: [{ title: 'Home', url: '/' }] }] },
    }),
  ],
})
```

`sitemap.xml`, `rss.xml` and the `llms.txt` links then name `https://example.com`, while
`Sitemap: https://preview.example.com/sitemap.xml` in robots.txt points at the file that is
actually there.

## Keep the path out of `site`

`site` is the host, `base` the path. The integration appends `base` itself, so a path in both
doubles it:

| `site` | `base` | Sitemap URL |
| --- | --- | --- |
| `https://casoon.github.io` | `/astro-site-files/` | `https://casoon.github.io/astro-site-files/sitemap.xml` |
| `https://casoon.github.io/astro-site-files` | `/astro-site-files/` | `https://casoon.github.io/astro-site-files/astro-site-files/sitemap.xml` |

This site uses the first row. The generated files are in the [showcase](../../../showcase/).

## Priorities below the base

Page depth for the built-in priority is counted below the base path. On this site the start page
`/astro-site-files/` gets `1.0`, `/astro-site-files/docs/` gets `0.9`. Your own `priority` and
`changefreq` patterns match the path without the base as well (`/docs/`, not
`/astro-site-files/docs/`).

## Deploying under a subpath

All files are written into the build output, so with a `base` they are served below it. Crawlers
and scanners only look at the host root:

- `robots.txt` is read only at `https://host/robots.txt`. Below a base path it has no effect on
  crawlers.
- `security.txt` is expected at `https://host/.well-known/security.txt`.
- `sitemap.xml` works from anywhere, as long as it is referenced from the root `robots.txt` or
  submitted in the search console.

On a GitHub project page like this one, the files show what the integration writes; the host
root belongs to the account's own `<user>.github.io` repository.

GitHub Pages deployments with `actions/upload-pages-artifact` leave out dot directories by default.
Set `include-hidden-files: true`, otherwise `.well-known/security.txt` is not deployed.
