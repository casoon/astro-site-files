import type { RegistryBot } from './types.js'

export const REGISTRY_VERSION = '2026-05-27'

export const defaultRegistry: RegistryBot[] = [
  // ── Search engines ──────────────────────────────────────────────────────────
  { id: 'Googlebot',        provider: 'Google',        userAgents: ['Googlebot'],        categories: ['search'],                       verified: true },
  { id: 'Bingbot',          provider: 'Microsoft',     userAgents: ['Bingbot'],          categories: ['search'],                       verified: true },
  { id: 'DuckDuckBot',      provider: 'DuckDuckGo',    userAgents: ['DuckDuckBot'],      categories: ['search'],                       verified: true },

  // ── Archives ────────────────────────────────────────────────────────────────
  { id: 'ia_archiver',      provider: 'Internet Archive', userAgents: ['ia_archiver'],   categories: ['archive'],                      verified: true },
  { id: 'archive.org_bot',  provider: 'Internet Archive', userAgents: ['archive.org_bot'], categories: ['archive'],                   verified: true },

  // ── OpenAI ──────────────────────────────────────────────────────────────────
  { id: 'GPTBot',           provider: 'OpenAI',        userAgents: ['GPTBot'],           categories: ['ai-training'],                  verified: true },
  { id: 'ChatGPT-User',     provider: 'OpenAI',        userAgents: ['ChatGPT-User'],     categories: ['ai-input'],                     verified: true },
  { id: 'OAI-SearchBot',    provider: 'OpenAI',        userAgents: ['OAI-SearchBot'],    categories: ['ai-search', 'ai-input'],        verified: true },

  // ── Anthropic ───────────────────────────────────────────────────────────────
  { id: 'ClaudeBot',        provider: 'Anthropic',     userAgents: ['ClaudeBot'],        categories: ['ai-input', 'ai-training'],      verified: true },
  { id: 'Claude-Web',       provider: 'Anthropic',     userAgents: ['Claude-Web'],       categories: ['ai-input'],                     verified: true },
  { id: 'anthropic-ai',     provider: 'Anthropic',     userAgents: ['anthropic-ai'],     categories: ['ai-input', 'ai-training'],      verified: true },

  // ── Google ──────────────────────────────────────────────────────────────────
  { id: 'Google-Extended',  provider: 'Google',        userAgents: ['Google-Extended'],  categories: ['ai-training'],                  verified: true },

  // ── Common Crawl ────────────────────────────────────────────────────────────
  { id: 'CCBot',            provider: 'Common Crawl',  userAgents: ['CCBot'],            categories: ['ai-training'],                  verified: true },

  // ── Perplexity ──────────────────────────────────────────────────────────────
  { id: 'PerplexityBot',    provider: 'Perplexity',    userAgents: ['PerplexityBot'],    categories: ['ai-search', 'ai-input'],        verified: true },

  // ── You.com ─────────────────────────────────────────────────────────────────
  { id: 'YouBot',           provider: 'You.com',       userAgents: ['YouBot'],           categories: ['ai-search', 'ai-input'],        verified: true },

  // ── ByteDance ───────────────────────────────────────────────────────────────
  { id: 'Bytespider',       provider: 'ByteDance',     userAgents: ['Bytespider'],       categories: ['ai-training'],                  verified: true },

  // ── Meta ────────────────────────────────────────────────────────────────────
  { id: 'meta-externalagent', provider: 'Meta',        userAgents: ['meta-externalagent'], categories: ['ai-input', 'ai-training'],   verified: true },

  // ── Amazon ──────────────────────────────────────────────────────────────────
  { id: 'Amazonbot',        provider: 'Amazon',        userAgents: ['Amazonbot'],        categories: ['ai-search', 'ai-input'],        verified: true },

  // ── Apple ───────────────────────────────────────────────────────────────────
  { id: 'Applebot-Extended', provider: 'Apple',        userAgents: ['Applebot-Extended'], categories: ['ai-training'],                verified: true },

  // ── Unknown / unverified AI ─────────────────────────────────────────────────
  { id: 'Diffbot',          provider: 'Diffbot',       userAgents: ['Diffbot'],          categories: ['unknown-ai'],                   verified: false },
  { id: 'Omgilibot',        provider: 'Webz.io',       userAgents: ['Omgilibot'],        categories: ['unknown-ai'],                   verified: false },

  // ── SEO scanners ────────────────────────────────────────────────────────────
  { id: 'AhrefsBot',        provider: 'Ahrefs',        userAgents: ['AhrefsBot'],        categories: ['seo-scanner'],                  verified: true },
  { id: 'SemrushBot',       provider: 'Semrush',       userAgents: ['SemrushBot'],       categories: ['seo-scanner'],                  verified: true },
  { id: 'MJ12bot',          provider: 'Majestic',      userAgents: ['MJ12bot'],          categories: ['seo-scanner'],                  verified: true },
  { id: 'DotBot',           provider: 'OpenLinkProfiler', userAgents: ['DotBot'],        categories: ['seo-scanner'],                  verified: true },
]
