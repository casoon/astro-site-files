import { open } from 'node:fs/promises'
import { join } from 'node:path'
import type { Changefreq } from './sitemap/types.js'

export const READ_CONCURRENCY = 16

export interface PageInfo {
  lastmod?: string
  isRedirect: boolean
  noindex: boolean
  changefreq?: Changefreq
  priority?: number
}

function pageFilePath(outDir: string, urlPath: string): string {
  return urlPath === '/' || urlPath.endsWith('/')
    ? join(outDir, urlPath, 'index.html')
    : join(outDir, urlPath)
}

/** One open() per page — mtime, redirect detection and metadata all come from it. */
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
      const lastmod = stats.mtime.toISOString().split('T')[0]
      if (content.slice(0, 512).toLowerCase().includes('<meta http-equiv="refresh"')) {
        return { lastmod, isRedirect: true, noindex: false }
      }
      return {
        lastmod,
        isRedirect: false,
        noindex: hasNoindex(content),
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
function hasNoindex(content: string): boolean {
  const headEnd = content.search(/<\/head>/i)
  const head = headEnd === -1 ? content : content.slice(0, headEnd)
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
