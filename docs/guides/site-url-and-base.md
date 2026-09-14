---
title: Site URL and base path
description: How site and base become the URLs in robots.txt, sitemap.xml and rss.xml, and what a subpath deployment means for crawlers.
order: 1
---

## Where the URLs come from

The integration builds its absolute URLs from Astro's own options:

- `robots.txt` (`Sitemap:` line), `sitemap.xml` (`<loc>`) and `rss.xml` use `site` + `base`.
- `sitemap.siteUrl` replaces `site` for the sitemap and the feed; `base` is still appended.
- `robots.sitemap` as a string replaces the whole Sitemap URL.
- `llms.txt` links and all `security.txt` and `humans.txt` values are written exactly as
  configured.

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
