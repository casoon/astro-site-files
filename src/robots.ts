import type { AgentRule, BotAction, RegistryBot, RobotsOptions } from './types.js'
import { defaultRegistry } from './registry.js'
import { PRESETS } from './presets.js'

function resolveAction(
  bot: RegistryBot,
  bots: Record<string, BotAction>,
  groups: NonNullable<RobotsOptions['groups']>,
): BotAction {
  if (bots[bot.id] !== undefined) return bots[bot.id]!

  const cats = bot.categories

  if (bot.verified === false && cats.includes('unknown-ai') && groups.unknownAi) {
    return groups.unknownAi
  }
  if (cats.includes('search') && groups.searchEngines) {
    return groups.searchEngines
  }
  if (cats.includes('archive') && groups.archives) {
    return groups.archives
  }
  if (cats.includes('seo-scanner') && groups.seoScanners) {
    return groups.seoScanners
  }
  if (
    bot.verified !== false &&
    cats.some(c => c === 'ai-search' || c === 'ai-input' || c === 'ai-training') &&
    groups.verifiedAi
  ) {
    return groups.verifiedAi
  }
  if (cats.includes('unknown-ai') && groups.unknownAi) {
    return groups.unknownAi
  }

  return bot.defaultAction ?? 'inherit'
}

function compileRegistryRules(options: RobotsOptions): AgentRule[] {
  if (!options.preset && !options.bots && !options.groups) return []

  const preset = options.preset ? PRESETS[options.preset] : {}
  const mergedBots: Record<string, BotAction> = { ...preset.bots, ...options.bots }
  const mergedGroups: NonNullable<RobotsOptions['groups']> = { ...preset.groups, ...options.groups }

  const registry: RegistryBot[] = [...defaultRegistry, ...(options.extraBots ?? [])]
  const rules: AgentRule[] = []

  for (const bot of registry) {
    const action = resolveAction(bot, mergedBots, mergedGroups)
    if (action === 'inherit') continue
    const ua = bot.userAgents.length === 1 ? bot.userAgents[0]! : bot.userAgents
    rules.push(action === 'disallow' ? { userAgent: ua, disallow: ['/'] } : { userAgent: ua, allow: ['/'] })
  }

  return rules
}

export function renderRobotsTxt(options: RobotsOptions, siteUrl?: string): string {
  const lines: string[] = []

  lines.push('User-agent: *')

  if (options.allow?.length) {
    for (const path of options.allow) lines.push(`Allow: ${path}`)
  }
  if (options.disallow?.length) {
    for (const path of options.disallow) lines.push(`Disallow: ${path}`)
  }
  if (options.crawlDelay !== undefined) {
    lines.push(`Crawl-delay: ${options.crawlDelay}`)
  }

  const allAgents = [...compileRegistryRules(options), ...(options.agents ?? [])]

  for (const agent of allAgents) {
    lines.push('')
    const uas = Array.isArray(agent.userAgent) ? agent.userAgent : [agent.userAgent]
    for (const ua of uas) lines.push(`User-agent: ${ua}`)
    if (agent.allow?.length) {
      for (const path of agent.allow) lines.push(`Allow: ${path}`)
    }
    if (agent.disallow?.length) {
      for (const path of agent.disallow) lines.push(`Disallow: ${path}`)
    }
    if (agent.crawlDelay !== undefined) lines.push(`Crawl-delay: ${agent.crawlDelay}`)
  }

  if (options.sitemap !== false) {
    const sitemapUrl =
      typeof options.sitemap === 'string'
        ? options.sitemap
        : siteUrl
          ? `${siteUrl.replace(/\/$/, '')}/sitemap.xml`
          : undefined
    if (sitemapUrl) {
      lines.push('')
      lines.push(`Sitemap: ${sitemapUrl}`)
    }
  }

  return lines.join('\n') + '\n'
}
