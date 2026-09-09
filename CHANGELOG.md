# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] — 2026-09-09

### Changed

These take effect without any config change.

- Pages carrying `<meta name="robots" content="noindex">` in their `<head>` are dropped from the
  sitemap — Search Console reports submitted `noindex` URLs as errors. Opt out with
  `sitemap.excludeNoindex: false`.
- `sitemap.i18n` defaults to Astro's own `i18n` config, so hreflang alternates and an `x-default`
  link now appear on multilingual sites that never configured `sitemap.i18n`.
- Built-in priority and changefreq defaults ignore locale prefixes: `/de/` is scored like `/`
  instead of one level below it, and `/de/blog/x/` like `/blog/x/`.
- A crawler with its own `robots.txt` group now also receives the global `allow` / `disallow` /
  `crawlDelay` rules. Per [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309) a bot obeys only its
  most specific matching group, so a `Disallow: /admin/` under `User-agent: *` previously did not
  apply to Googlebot at all. Blocked bots keep a bare `Disallow: /` — a global `Allow:` must not
  punch a hole into a bot that was deliberately blocked outright.
- The `Sitemap:` line in `robots.txt` points at the file that was actually written —
  `sitemap-index.xml` in index mode, or `output.filename`.

### Added

- `rss` is a top-level option and is written independently of the sitemap, including with
  `sitemap: false`.
- Per-item `guid` and `guidIsPermaLink` for feeds keyed by UUID or URN.
- `sitemap.localeAgnosticRules` and a per-rule `allLocales` flag, so a single `priority` or
  `changefreq` rule can cover every translation — or opt back out to target one locale.
- `sitemap.excludeNoindex` to keep `noindex` pages in the sitemap.
- Audit rules `security/expired`, `security/invalid-expires` and `security/contact-not-a-uri`
  for [RFC 9116](https://www.rfc-editor.org/rfc/rfc9116) conformance.

### Fixed

- A pathname without a trailing slash no longer crashes the build with `EISDIR` when it maps to a
  directory on disk; its `index.html` is read instead.
- Error-page exclusion is anchored to a whole path segment, so an article like
  `/blog/404-error-pages-guide/` stays in the sitemap.
- `data-sitemap-changefreq` and `data-sitemap-priority` are read from every JSON-LD block, not only
  the first — layouts commonly emit an `Organization` block ahead of the page's own `Article`.
- A configured priority of `0.55` is no longer rounded to `0.6`.
- RSS: root-relative and bare item links are joined onto the site URL without dropping or doubling
  the slash.
- RSS: an unparseable `pubDate` omits the `<pubDate>` element instead of emitting `Invalid Date`,
  which breaks every feed validator.

### Deprecated

- `sitemap.rss` — use the top-level `rss` option. The old placement still works and is read as a
  fallback.

### Performance

- Each page's HTML is opened and read once instead of twice, with bounded concurrency, rather than
  strictly sequentially. Noticeable on sites with thousands of pages.

### Internal

- `peerDependencies: { astro: ">=6.0.0" }` added — `peerDependenciesMeta` had no effect without it.
- `npm ci` works again; the lockfile carried a stale nested `@emnapi/wasi-threads`.
- devDependencies on latest: TypeScript 7, vitest 5, `@types/node` 26.5. Resolves all four known
  dev-dependency advisories. TypeScript 7 no longer auto-includes `@types/*`, hence the explicit
  `"types": ["node"]` in `tsconfig.json`.

## [0.4.1] — earlier

Summarised from the git history; these releases predate this changelog.

- Full bot registry and preset system ported from `@casoon/astro-crawler-policy`
  (`seoOnly`, `citationFriendly`, `openToAi`, `blockTraining`, `lockdown`).
- Per-page `changefreq` / `priority` via `data-sitemap-*` attributes on a JSON-LD script tag.
- Meta-refresh redirect pages excluded from the sitemap.

## [0.3.0] — earlier

- RSS 2.0 feed support extracted from `@casoon/astro-sitemap`, including `createRssRoute`.

## [0.2.0] — earlier

- Unified audit types, `llms.sources`, XML escaping, base-aware robots URL, sitemap deduplication.
- Node.js ≥ 22.12.0.

[0.5.0]: https://github.com/casoon/astro-site-files/releases/tag/v0.5.0
[0.4.1]: https://github.com/casoon/astro-site-files/releases/tag/v0.4.1
[0.3.0]: https://github.com/casoon/astro-site-files/releases/tag/v0.3.0
[0.2.0]: https://github.com/casoon/astro-site-files/releases/tag/v0.2.0
