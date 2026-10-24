import { describe, expect, it } from 'vitest'
import { defaultRegistry } from './registry.js'
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


/** Matches the `User-agent:` line exactly — `Applebot` must not find `Applebot-Extended`. */
function blockFor(robots: string, userAgent: string): string | undefined {
  return robots
    .split('\n\n')
    .find(block => block.split('\n').some(line => line === `User-agent: ${userAgent}`))
}

const globalBlock = (robots: string) => robots.split('\n\n')[0]!

const trainingBots = defaultRegistry.filter(b => b.categories.includes('ai-training'))
const trainingOnlyBots = trainingBots.filter(
  b => !b.categories.some(c => c === 'ai-search' || c === 'ai-input'),
)

describe('renderRobotsTxt lockdown closes the global group', () => {
  it('disallows everything under User-agent: * so unlisted crawlers are covered', () => {
    const result = renderRobotsTxt({ preset: 'lockdown' })
    expect(globalBlock(result)).toBe('User-agent: *\nDisallow: /')
  })

  it('keeps the global group open for presets that only target known bots', () => {
    // seoOnly must not block unknown *search* engines, so `*` stays permissive
    // and registry coverage is the only lever there.
    for (const preset of ['seoOnly', 'citationFriendly', 'openToAi', 'blockTraining'] as const) {
      expect(globalBlock(renderRobotsTxt({ preset }))).toBe('User-agent: *')
    }
  })

  it('keeps user-supplied global rules alongside the blanket disallow', () => {
    const result = renderRobotsTxt({ preset: 'lockdown', allow: ['/public/'], disallow: ['/admin/'] })
    expect(globalBlock(result)).toBe('User-agent: *\nAllow: /public/\nDisallow: /admin/\nDisallow: /')
  })

  it('does not leak the blanket disallow into a bot the user re-allowed', () => {
    const result = renderRobotsTxt({ preset: 'lockdown', groups: { searchEngines: 'allow' } })
    const googlebot = blockFor(result, 'Googlebot')

    expect(googlebot).toContain('Allow: /')
    expect(googlebot).not.toContain('Disallow: /')
  })
})

describe('bot registry', () => {
  it('covers the crawlers Anthropic currently documents', () => {
    const result = renderRobotsTxt({ preset: 'seoOnly' })

    for (const ua of ['ClaudeBot', 'Claude-User', 'Claude-SearchBot']) {
      expect(blockFor(result, ua), ua).toContain('Disallow: /')
    }
  })

  it('has unique ids and user agents', () => {
    const ids = defaultRegistry.map(b => b.id)
    const userAgents = defaultRegistry.flatMap(b => b.userAgents)

    expect(ids).toHaveLength(new Set(ids).size)
    expect(userAgents).toHaveLength(new Set(userAgents).size)
  })

  it('declares at least one category per bot', () => {
    for (const bot of defaultRegistry) {
      expect(bot.categories.length, bot.id).toBeGreaterThan(0)
    }
  })
})

describe('training rules are derived from categories, not a hand-kept bot list', () => {
  it('blockTraining blocks every registry bot with a training purpose', () => {
    const result = renderRobotsTxt({ preset: 'blockTraining' })

    for (const bot of trainingBots) {
      const block = blockFor(result, bot.userAgents[0]!)
      expect(block, bot.id).toContain('Disallow: /')
      expect(block, bot.id).not.toContain('Allow:')
    }
  })

  it('citationFriendly blocks training-only bots', () => {
    const result = renderRobotsTxt({ preset: 'citationFriendly' })

    expect(trainingOnlyBots.map(b => b.id)).toContain('MistralAI-Training')
    for (const bot of trainingOnlyBots) {
      expect(blockFor(result, bot.userAgents[0]!), bot.id).toContain('Disallow: /')
    }
  })

  it('citationFriendly still allows bots that answer prompts or build a search index', () => {
    const result = renderRobotsTxt({ preset: 'citationFriendly' })
    const citationBots = defaultRegistry.filter(
      b => b.verified !== false && b.categories.some(c => c === 'ai-search' || c === 'ai-input'),
    )

    expect(citationBots.map(b => b.id)).toContain('Claude-SearchBot')
    for (const bot of citationBots) {
      expect(blockFor(result, bot.userAgents[0]!), bot.id).toContain('Allow: /')
    }
  })

  it('a per-bot override still wins over the derived training rule', () => {
    const result = renderRobotsTxt({ preset: 'blockTraining', bots: { GPTBot: 'allow' } })
    expect(blockFor(result, 'GPTBot')).toContain('Allow: /')
  })
})
