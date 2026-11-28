import { open } from 'node:fs/promises'
import { join } from 'node:path'
import type { Changefreq } from './sitemap/types.js'

export const READ_CONCURRENCY = 16

export interface PageInfo {
  lastmod?: string
  isRedirect: boolean
  noindex: boolean
  canonical?: string
  changefreq?: Changefreq
  priority?: number
}

function pageFilePath(outDir: string, urlPath: string): string {
  return urlPath === '/' || urlPath.endsWith('/')
    ? join(outDir, urlPath, 'index.html')
    : join(outDir, urlPath)
}

function extractHead(content: string): string {
  const headEnd = content.search(/<\/head>/i)
  return headEnd === -1 ? content : content.slice(0, headEnd)
}

function hasMetaRefresh(head: string): boolean {
  return /<meta\s[^>]*http-equiv=["']refresh["'][^>]*>/i.test(head)
}

function extractCanonical(head: string): string | undefined {
  for (const match of head.matchAll(/<link\s+([^>]*)>/gi)) {
    const attrs = match[1]!
    const rel = /rel=["']([^"']*)["']/i.exec(attrs)?.[1]?.trim().toLowerCase()
    if (rel !== 'canonical') continue
    const href = /href=["']([^"']*)["']/i.exec(attrs)?.[1]?.trim()
    if (href) return href
  }
  return undefined
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/

function normalizeDate(value: string | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  const match = ISO_DATE_RE.exec(trimmed)
  return match ? match[0] : undefined
}

/**
 * Extract a verifiable content modification date from the rendered page instead
 * of using `dist/` file mtime (which is always the build timestamp and causes
 * Google to ignore `<lastmod>` site-wide).
 */
function extractLastmod(head: string, content: string): string | undefined {
  for (const match of head.matchAll(/<meta\s+([^>]*)>/gi)) {
    const attrs = match[1]!
    const prop = /(?:property|name)=["']([^"']*)["']/i.exec(attrs)?.[1]?.trim().toLowerCase()
    if (prop === 'article:modified_time' || prop === 'og:updated_time') {
      const val = /content=["']([^"']*)["']/i.exec(attrs)?.[1]
      const date = normalizeDate(val)
      if (date) return date
    }
  }
  for (const match of content.matchAll(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const jsonText = match[1]!
    const modMatch = /"dateModified"\s*:\s*"([^"]+)"/.exec(jsonText)
    const date = normalizeDate(modMatch?.[1])
    if (date) return date
  }
  return undefined
}

/** One open() per page — redirect detection, canonical, lastmod and metadata all come from it. */
export async function readPageInfo(outDir: string, urlPath: string): Promise<PageInfo> {
  const primary = pageFilePath(outDir, urlPath)
  // A pathname without a trailing slash (a fallback route, say) still maps to a
  // directory on disk under `build.format: 'directory'` — reading that directory
  // would throw EISDIR, so fall through to its index.html.
  for (const path of [primary, join(primary, 'index.html')]) {
    const fh = await open(path, 'r').catch(() => null)
    if (!fh) continue
    try {
      const stats = await fh.stat()
      if (stats.isDirectory()) continue
      const content = await fh.readFile('utf-8')
      const head = extractHead(content)
      if (hasMetaRefresh(head)) {
        return { isRedirect: true, noindex: false }
      }
      return {
        lastmod: extractLastmod(head, content),
        isRedirect: false,
        noindex: hasNoindex(head),
        canonical: extractCanonical(head),
        ...parseHtmlMetadata(content),
      }
    } finally {
      await fh.close()
    }
  }
  return { isRedirect: false, noindex: false }
}

/**
 * A page carrying `<meta name="robots" content="noindex">` must not be submitted
 * in a sitemap — Search Console reports it as an error. Only the `<head>` counts.
 */
function hasNoindex(head: string): boolean {
  for (const match of head.matchAll(/<meta\s+([^>]*)>/gi)) {
    const attrs = match[1]!
    const name = /name=["']([^"']*)["']/i.exec(attrs)?.[1]?.trim().toLowerCase()
    if (name !== 'robots' && name !== 'googlebot') continue
    const directives = /content=["']([^"']*)["']/i.exec(attrs)?.[1]?.toLowerCase() ?? ''
    if (directives.split(',').some(d => d.trim() === 'noindex' || d.trim() === 'none')) return true
  }
  return false
}

const VALID_CHANGEFREQS = new Set<string>(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'])

function parseHtmlMetadata(content: string): { changefreq?: Changefreq; priority?: number } {
  const res: { changefreq?: Changefreq; priority?: number } = {}

  // Capture the full opening tag of every JSON-LD script to find data-sitemap-*
  // attributes regardless of attribute order. Pages routinely emit more than one
  // block (Organization from the layout, Article from the page) — the annotated
  // one is not necessarily the first.
  for (const match of content.matchAll(/<script\s+([^>]*type=["']application\/ld\+json["'][^>]*)>/gi)) {
    const attrs = match[1]!
    const changefreqMatch = /data-sitemap-changefreq=["'](.*?)["']/i.exec(attrs)
    const priorityMatch = /data-sitemap-priority=["'](.*?)["']/i.exec(attrs)

    if (changefreqMatch && res.changefreq === undefined) {
      const val = changefreqMatch[1]!.toLowerCase()
      if (VALID_CHANGEFREQS.has(val)) res.changefreq = val as Changefreq
    }
    if (priorityMatch && res.priority === undefined) {
      const val = parseFloat(priorityMatch[1]!)
      if (!isNaN(val)) res.priority = val
    }
    if (res.changefreq !== undefined && res.priority !== undefined) break
  }

  return res
}

/** Bounded-concurrency map that preserves input order. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index]!)
    }
  })
  await Promise.all(workers)
  return results
}
