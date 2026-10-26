# Changelog

All notable changes to `@casoon/astro-site-files` are listed here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html): while it is at 0.x, a minor version
may change existing behaviour.

## [Unreleased]

## [0.7.1] - 2026-10-26

### Added

- **Releases:** the Release workflow publishes the package to npm through trusted publishing, after approval in the `npm` environment — no npm token is stored anywhere and the package carries a provenance statement.


## [0.7.0] - 2026-10-24

### Added

- **Audit:** rule `llms/relative-links` (`warn`) for relative link URLs that cannot be resolved
  because no site URL is configured. Details:
  [Rules](https://casoon.github.io/astro-site-files/docs/guides/audit/#rules).

### Fixed

- **llms.txt:** relative link URLs are resolved against `site` + `base` (`sitemap.siteUrl` wins over
  `site`, as for the sitemap), so `/lohnmosterei/` is written as
  `https://example.com/lohnmosterei/`. Absolute URLs, `mailto:`/`tel:` and protocol-relative links
  stay as given. Details:
  [llms.txt](https://casoon.github.io/astro-site-files/docs/configuration/llms-txt/).

## [0.6.0] - 2026-10-24

### Added

- **Robots:** the bot registry grows from 25 to 64 crawlers, covering those that appeared since the
  last update — among them `Claude-User`, `Claude-SearchBot` and the `MistralAI-*` family.
  `REGISTRY_VERSION` is now `2026-10-24`. Details:
  [Bot registry](https://casoon.github.io/astro-site-files/docs/configuration/robots-txt/#bot-registry).

### Fixed

- **Robots:** `preset: 'lockdown'` now emits `Disallow: /` in the global `User-agent: *` group. That
  group was left empty, so per [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309) every crawler
  missing from the registry fell back to it and was free to crawl.
- **Robots:** `citationFriendly` and `blockTraining` derive their training rules from the registry's
  categories instead of a hand-maintained list of bot ids, which had not grown with the registry.
  Details: [Presets](https://casoon.github.io/astro-site-files/docs/configuration/robots-txt/#presets).
- **Robots:** the `Sitemap:` line falls back to `sitemap.siteUrl` when Astro's `site` is unset —
  previously no `Sitemap:` line was written at all. With both set, `site` still wins. Details:
  [Site URL and base path](https://casoon.github.io/astro-site-files/docs/guides/site-url-and-base/).

## [0.5.0] - 2026-09-09

### Added

- **Audit:** rules `security/expired`, `security/invalid-expires` and `security/contact-not-a-uri`
  for [RFC 9116](https://www.rfc-editor.org/rfc/rfc9116) conformance. Details:
  [Rules](https://casoon.github.io/astro-site-files/docs/guides/audit/#rules).
- **RSS:** `rss` is a top-level option and is written independently of the sitemap, including with
  `sitemap: false`. Details: [RSS feed](https://casoon.github.io/astro-site-files/docs/configuration/rss/#options).
- **RSS:** per-item `guid` and `guidIsPermaLink` for feeds keyed by UUID or URN.
- **Sitemap:** `sitemap.localeAgnosticRules` and a per-rule `allLocales` flag, so a single
  `priority` or `changefreq` rule can cover every translation — or opt back out to target one
  locale. Details: [Built-in priority and changefreq](https://casoon.github.io/astro-site-files/docs/configuration/sitemap-xml/#built-in-priority-and-changefreq).
- **Sitemap:** `sitemap.excludeNoindex` to keep `noindex` pages in the sitemap.

### Changed

- **Robots:** a crawler with its own group now also receives the global `allow` / `disallow` /
  `crawlDelay` rules, since per [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309) a bot obeys only
  its most specific matching group. Details:
  [Global rules inside bot groups](https://casoon.github.io/astro-site-files/docs/configuration/robots-txt/#global-rules-inside-bot-groups).
- **Robots:** the `Sitemap:` line points at the file that was actually written —
  `sitemap-index.xml` in index mode, or `output.filename`.
- **Sitemap:** the built-in exclusions no longer drop paths under `/api/`, `/landing/` and
  `/drafts/`; they guessed at content rather than structure and ran before `exclude` / `filter`,
  so no configuration could bring such a page back.
- **Sitemap:** paths dropped by a built-in rule or by meta-refresh redirect detection are logged
  instead of disappearing silently.
- **Sitemap:** pages carrying `<meta name="robots" content="noindex">` are dropped, since Search
  Console reports submitted `noindex` URLs as errors. Opt out with `sitemap.excludeNoindex: false`.
- **Sitemap:** `sitemap.i18n` defaults to Astro's own `i18n` config, so hreflang alternates and an
  `x-default` link appear on multilingual sites that never configured `sitemap.i18n`. Details:
  [Multilingual sites](https://casoon.github.io/astro-site-files/docs/configuration/sitemap-xml/#multilingual-sites).
- **Sitemap:** built-in priority and changefreq defaults ignore locale prefixes: `/de/` is scored
  like `/`, and `/de/blog/x/` like `/blog/x/`.
- **Sitemap:** each page's HTML is opened and read once instead of twice, with bounded concurrency
  rather than strictly sequentially. Noticeable on sites with thousands of pages.
- **npm:** `peerDependencies: { astro: ">=6.0.0" }` added — `peerDependenciesMeta` had no effect
  without it.
- **npm:** `npm ci` works again; the lockfile carried a stale nested `@emnapi/wasi-threads`.
- **Contributors:** devDependencies on latest — TypeScript 7, vitest 5 and `@types/node` 26.5,
  which resolves all four known dev-dependency advisories. TypeScript 7 no longer auto-includes
  `@types/*`, hence the explicit `"types": ["node"]` in `tsconfig.json`.

### Deprecated

- **Sitemap:** `sitemap.rss` — use the top-level `rss` option. The old placement still works and is
  read as a fallback.

### Fixed

- **RSS:** root-relative and bare item links are joined onto the site URL without dropping or
  doubling the slash.
- **RSS:** an unparseable `pubDate` omits the `<pubDate>` element instead of emitting
  `Invalid Date`, which breaks every feed validator.
- **Sitemap:** a pathname without a trailing slash no longer crashes the build with `EISDIR` when
  it maps to a directory on disk; its `index.html` is read instead.
- **Sitemap:** error-page exclusion is anchored to a whole path segment, so an article like
  `/blog/404-error-pages-guide/` stays in the sitemap.
- **Sitemap:** `data-sitemap-changefreq` and `data-sitemap-priority` are read from every JSON-LD
  block, not only the first — layouts commonly emit an `Organization` block ahead of the page's own
  `Article`.
- **Sitemap:** a configured priority of `0.55` is no longer rounded to `0.6`.

## [0.4.1] - 2026-06-01

### Added

- **Robots:** full bot registry and preset system ported from `@casoon/astro-crawler-policy`
  (`seoOnly`, `citationFriendly`, `openToAi`, `blockTraining`, `lockdown`).
- **Sitemap:** per-page `changefreq` / `priority` via `data-sitemap-*` attributes on a JSON-LD
  script tag.

### Changed

- **Sitemap:** meta-refresh redirect pages are excluded.

## [0.3.0] - 2026-05-26

### Added

- **RSS:** RSS 2.0 feed support extracted from `@casoon/astro-sitemap`, including
  `createRssRoute`.

## [0.2.0] - 2026-05-26

### Added

- **Audit:** unified audit types.
- **llms.txt:** `llms.sources`.

### Changed

- **Robots:** the robots URL is base-aware.
- **Sitemap:** entries are deduplicated and XML is escaped.
- **npm:** Node.js ≥ 22.12.0 required.

[Unreleased]: https://github.com/casoon/astro-site-files/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/casoon/astro-site-files/releases/tag/v0.6.0
[0.5.0]: https://github.com/casoon/astro-site-files/releases/tag/v0.5.0
[0.4.1]: https://github.com/casoon/astro-site-files/releases/tag/v0.4.1
[0.3.0]: https://github.com/casoon/astro-site-files/releases/tag/v0.3.0
[0.2.0]: https://github.com/casoon/astro-site-files/releases/tag/v0.2.0
