import type { LlmsOptions } from './types.js'

/** `mailto:`, `tel:`, `https:` — anything already carrying a scheme stays as it is. */
const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:/i

/**
 * llms.txt is read without any page context, so a relative link like
 * `/lohnmosterei/` has nothing to resolve against. Prefix `site` + `base` the
 * same way the sitemap does; without a site URL the link is left untouched and
 * `auditLlms` warns about it.
 */
export function isRelativeLlmsUrl(url: string): boolean {
  return !ABSOLUTE_URL.test(url) && !url.startsWith('//')
}

export function resolveLlmsLinkUrl(url: string, siteUrl: string | undefined): string {
  if (!isRelativeLlmsUrl(url)) return url
  const base = siteUrl?.replace(/\/$/, '')
  if (!base) return url
  return `${base}${url.startsWith('/') ? url : `/${url}`}`
}

export function renderLlmsTxt(options: LlmsOptions, siteUrl?: string): string {
  const lines: string[] = []

  lines.push(`# ${options.title}`)

  if (options.description) {
    lines.push('')
    lines.push(`> ${options.description}`)
  }

  if (options.details) {
    lines.push('')
    lines.push(options.details)
  }

  if (options.sections?.length) {
    for (const section of options.sections) {
      lines.push('')
      lines.push(`## ${section.title}`)
      if (section.links?.length) {
        lines.push('')
        for (const link of section.links) {
          const desc = link.description ? `: ${link.description}` : ''
          lines.push(`- [${link.title}](${resolveLlmsLinkUrl(link.url, siteUrl)})${desc}`)
        }
      }
    }
  }

  return lines.join('\n') + '\n'
}
