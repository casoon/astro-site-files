import { describe, expect, it } from 'vitest'
import { renderRobotsTxt } from './robots.js'

describe('renderRobotsTxt', () => {
  it('renders default allow-all rule without empty Disallow line', () => {
    const result = renderRobotsTxt({})
    expect(result).toContain('User-agent: *')
    expect(result).not.toContain('Disallow:')
  })

  it('renders disallow paths', () => {
    const result = renderRobotsTxt({ disallow: ['/admin', '/private/'] })
    expect(result).toContain('Disallow: /admin')
    expect(result).toContain('Disallow: /private/')
  })

  it('does not render empty Disallow when disallow paths are provided', () => {
    const result = renderRobotsTxt({ disallow: ['/admin'] })
    expect(result).not.toContain('Disallow:\n')
  })

  it('renders allow paths', () => {
    const result = renderRobotsTxt({ allow: ['/public/'] })
    expect(result).toContain('Allow: /public/')
  })

  it('renders crawl-delay', () => {
    const result = renderRobotsTxt({ crawlDelay: 10 })
    expect(result).toContain('Crawl-delay: 10')
  })

  it('renders sitemap URL derived from siteUrl', () => {
    const result = renderRobotsTxt({}, 'https://example.com')
    expect(result).toContain('Sitemap: https://example.com/sitemap.xml')
  })

  it('renders explicit sitemap URL', () => {
    const result = renderRobotsTxt({ sitemap: 'https://example.com/custom-sitemap.xml' })
    expect(result).toContain('Sitemap: https://example.com/custom-sitemap.xml')
  })

  it('omits sitemap when sitemap: false', () => {
    const result = renderRobotsTxt({ sitemap: false }, 'https://example.com')
    expect(result).not.toContain('Sitemap:')
  })

  it('omits sitemap when no siteUrl and no explicit URL', () => {
    const result = renderRobotsTxt({})
    expect(result).not.toContain('Sitemap:')
  })

  it('renders additional agent blocks', () => {
    const result = renderRobotsTxt({
      agents: [
        { userAgent: 'Googlebot', disallow: ['/private/'] }
      ]
    })
    expect(result).toContain('User-agent: Googlebot')
    expect(result).toContain('Disallow: /private/')
  })

  it('renders multiple user-agents in one block', () => {
    const result = renderRobotsTxt({
      agents: [
        { userAgent: ['Googlebot', 'Bingbot'], allow: ['/'] }
      ]
    })
    expect(result).toContain('User-agent: Googlebot')
    expect(result).toContain('User-agent: Bingbot')
  })

  it('output ends with a newline', () => {
    expect(renderRobotsTxt({}).endsWith('\n')).toBe(true)
  })
})
