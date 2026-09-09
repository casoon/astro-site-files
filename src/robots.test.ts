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

describe('renderRobotsTxt with presets', () => {
  it('seoOnly blocks AI bots and allows search engines', () => {
    const result = renderRobotsTxt({ preset: 'seoOnly' })
    expect(result).toContain('User-agent: GPTBot')
    expect(result).toContain('Disallow: /')
    expect(result).toContain('User-agent: Googlebot')
    expect(result).toContain('Allow: /')
    expect(result).toContain('User-agent: ia_archiver')
  })

  it('blockTraining disallows training bots but allows search', () => {
    const result = renderRobotsTxt({ preset: 'blockTraining' })
    expect(result).toContain('User-agent: GPTBot')
    expect(result).toContain('Disallow: /')
    expect(result).toContain('User-agent: Googlebot')
    expect(result).toContain('Allow: /')
  })

  it('openToAi emits Allow for all known bots', () => {
    const result = renderRobotsTxt({ preset: 'openToAi' })
    expect(result).not.toMatch(/User-agent: GPTBot[\s\S]*?Disallow/)
    expect(result).toContain('User-agent: Googlebot')
    expect(result).toContain('Allow: /')
  })

  it('per-bot override takes precedence over preset', () => {
    const result = renderRobotsTxt({ preset: 'openToAi', bots: { GPTBot: 'disallow' } })
    const gptBotBlock = result.split('\n\n').find(b => b.includes('User-agent: GPTBot'))
    expect(gptBotBlock).toContain('Disallow: /')
  })

  it('group override takes precedence over preset', () => {
    const result = renderRobotsTxt({ preset: 'openToAi', groups: { searchEngines: 'disallow' } })
    const googlebotBlock = result.split('\n\n').find(b => b.includes('User-agent: Googlebot'))
    expect(googlebotBlock).toContain('Disallow: /')
  })

  it('extraBots are included in compilation', () => {
    const result = renderRobotsTxt({
      preset: 'seoOnly',
      extraBots: [{ id: 'CustomBot', provider: 'Test', userAgents: ['CustomBot'], categories: ['ai-training'], verified: true }],
    })
    expect(result).toContain('User-agent: CustomBot')
    expect(result).toContain('Disallow: /')
  })

  it('agents are appended after registry rules', () => {
    const result = renderRobotsTxt({
      preset: 'seoOnly',
      agents: [{ userAgent: 'ManualBot', disallow: ['/secret/'] }],
    })
    expect(result).toContain('User-agent: ManualBot')
    expect(result).toContain('Disallow: /secret/')
  })
})

describe('renderRobotsTxt global rules and named bot groups', () => {
  it('repeats the global rules inside every generated allow block', () => {
    const result = renderRobotsTxt({
      disallow: ['/admin/'],
      allow: ['/admin/public/'],
      crawlDelay: 5,
      preset: 'seoOnly',
    })
    const googlebotBlock = result.split('\n\n').find(b => b.includes('User-agent: Googlebot'))

    // A crawler obeys only its most specific matching group, so without this the
    // `User-agent: *` rules would not apply to Googlebot at all.
    expect(googlebotBlock).toContain('Allow: /')
    expect(googlebotBlock).toContain('Allow: /admin/public/')
    expect(googlebotBlock).toContain('Disallow: /admin/')
    expect(googlebotBlock).toContain('Crawl-delay: 5')
  })

  it('leaves blocked bots fully blocked instead of leaking a global allow', () => {
    const result = renderRobotsTxt({ allow: ['/public/'], preset: 'seoOnly' })
    const gptBlock = result.split('\n\n').find(b => b.includes('User-agent: GPTBot'))

    expect(gptBlock).toContain('Disallow: /')
    expect(gptBlock).not.toContain('Allow:')
  })

  it('does not touch explicit agent blocks', () => {
    const result = renderRobotsTxt({
      disallow: ['/admin/'],
      agents: [{ userAgent: 'ManualBot', disallow: ['/secret/'] }],
    })
    const manualBlock = result.split('\n\n').find(b => b.includes('User-agent: ManualBot'))

    expect(manualBlock).toContain('Disallow: /secret/')
    expect(manualBlock).not.toContain('Disallow: /admin/')
  })

  it('points the Sitemap line at the filename the sitemap writer produced', () => {
    const result = renderRobotsTxt({}, 'https://example.com', 'sitemap-index.xml')
    expect(result).toContain('Sitemap: https://example.com/sitemap-index.xml')
  })
})

