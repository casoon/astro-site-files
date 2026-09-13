---
title: Overview
description: What astro-site-files generates, when it runs, and how this documentation is organised.
order: 0
---

`@casoon/astro-site-files` is an Astro integration. When `astro build` finishes, it writes the
site's meta files into the build output, each from its own typed options object:

| File | Option | Default |
| --- | --- | --- |
| `robots.txt` | [`robots`](configuration/robots-txt/) | on |
| `sitemap.xml` | [`sitemap`](configuration/sitemap-xml/) | on |
| `llms.txt` | [`llms`](configuration/llms-txt/) | off, needs `title` |
| `rss.xml` | [`rss`](configuration/rss/) | off, needs `title`, `description`, `getItems` |
| `.well-known/security.txt` | [`security`](configuration/security-txt/) | off, needs `contact` |
| `humans.txt` | [`humans`](configuration/humans-txt/) | off |

All files are written in Astro's `astro:build:done` hook, after the pages exist. That is what lets
the sitemap list exactly the pages that were built, and lets `robots.txt` point at the sitemap
file that was actually written.

The package has no runtime dependencies. Astro is an optional peer dependency (`>=6.0.0`): the
renderer functions also work without it, see the [API overview](reference/api/).

## How the docs are organised

- **Getting started**: [install](getting-started/installation/) the package and generate the
  first files with the [quickstart](getting-started/quickstart/).
- **Configuration**: one page per file with its options interface, defaults and real output.
- **Guides**: [site URL and base path](guides/site-url-and-base/) and the
  [build-time audit](guides/audit/).
- **Reference**: the [exports and types](reference/api/) at a glance.

This site uses the integration itself. The [showcase](../showcase/) shows the five files it
generated during this build, next to the configuration that produced them.
