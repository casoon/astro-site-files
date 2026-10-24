import type { RegistryBot } from './types.js'

export const REGISTRY_VERSION = '2026-10-24'

/**
 * Categories drive the preset rules, so they describe what a bot is *for*, not
 * who runs it:
 *
 * - `ai-training`   — content may end up in a model's training set
 * - `ai-search`     — builds an index that an AI product answers from
 * - `ai-input`      — fetches a page on demand for an assistant or agent
 * - `unknown-ai`    — AI-adjacent, purpose not documented by the operator
 *
 * `verified: false` marks bots whose operator does not publish a crawler policy;
 * the `unknownAi` group targets exactly those.
 */
export const defaultRegistry: RegistryBot[] = [
  // ── Search engines ──────────────────────────────────────────────────────────
  { id: 'Googlebot',        provider: 'Google',        userAgents: ['Googlebot'],        categories: ['search'],                       verified: true },
  { id: 'Bingbot',          provider: 'Microsoft',     userAgents: ['Bingbot'],          categories: ['search'],                       verified: true },
  { id: 'DuckDuckBot',      provider: 'DuckDuckGo',    userAgents: ['DuckDuckBot'],      categories: ['search'],                       verified: true },
  { id: 'Applebot',         provider: 'Apple',         userAgents: ['Applebot'],         categories: ['search'],                       verified: true },

  // ── Archives ────────────────────────────────────────────────────────────────
  { id: 'ia_archiver',      provider: 'Internet Archive', userAgents: ['ia_archiver'],   categories: ['archive'],                      verified: true },
  { id: 'archive.org_bot',  provider: 'Internet Archive', userAgents: ['archive.org_bot'], categories: ['archive'],                   verified: true },

  // ── OpenAI ──────────────────────────────────────────────────────────────────
  { id: 'GPTBot',           provider: 'OpenAI',        userAgents: ['GPTBot'],           categories: ['ai-training'],                  verified: true },
  { id: 'ChatGPT-User',     provider: 'OpenAI',        userAgents: ['ChatGPT-User'],     categories: ['ai-input'],                     verified: true },
  { id: 'OAI-SearchBot',    provider: 'OpenAI',        userAgents: ['OAI-SearchBot'],    categories: ['ai-search', 'ai-input'],        verified: true },
  { id: 'OAI-AdsBot',       provider: 'OpenAI',        userAgents: ['OAI-AdsBot'],       categories: ['ai-input'],                     verified: true },

  // ── Anthropic ───────────────────────────────────────────────────────────────
  { id: 'ClaudeBot',        provider: 'Anthropic',     userAgents: ['ClaudeBot'],        categories: ['ai-input', 'ai-training'],      verified: true },
  { id: 'Claude-User',      provider: 'Anthropic',     userAgents: ['Claude-User'],      categories: ['ai-input'],                     verified: true },
  { id: 'Claude-SearchBot', provider: 'Anthropic',     userAgents: ['Claude-SearchBot'], categories: ['ai-search'],                    verified: true },
  // Claude-Web and anthropic-ai are no longer documented by Anthropic — kept so
  // rules still apply to clients that never updated their user agent.
  { id: 'Claude-Web',       provider: 'Anthropic',     userAgents: ['Claude-Web'],       categories: ['ai-input'],                     verified: true },
  { id: 'anthropic-ai',     provider: 'Anthropic',     userAgents: ['anthropic-ai'],     categories: ['ai-input', 'ai-training'],      verified: true },

  // ── Google ──────────────────────────────────────────────────────────────────
  { id: 'Google-Extended',  provider: 'Google',        userAgents: ['Google-Extended'],  categories: ['ai-training'],                  verified: true },
  { id: 'Google-CloudVertexBot', provider: 'Google',   userAgents: ['Google-CloudVertexBot'], categories: ['ai-input'],               verified: true },

  // ── Common Crawl ────────────────────────────────────────────────────────────
  { id: 'CCBot',            provider: 'Common Crawl',  userAgents: ['CCBot'],            categories: ['ai-training'],                  verified: true },

  // ── Perplexity ──────────────────────────────────────────────────────────────
  { id: 'PerplexityBot',    provider: 'Perplexity',    userAgents: ['PerplexityBot'],    categories: ['ai-search', 'ai-input'],        verified: true },
  { id: 'Perplexity-User',  provider: 'Perplexity',    userAgents: ['Perplexity-User'],  categories: ['ai-input'],                     verified: true },

  // ── You.com ─────────────────────────────────────────────────────────────────
  { id: 'YouBot',           provider: 'You.com',       userAgents: ['YouBot'],           categories: ['ai-search', 'ai-input'],        verified: true },

  // ── DuckDuckGo ──────────────────────────────────────────────────────────────
  { id: 'DuckAssistBot',    provider: 'DuckDuckGo',    userAgents: ['DuckAssistBot'],    categories: ['ai-input'],                     verified: true },

  // ── Mistral AI ──────────────────────────────────────────────────────────────
  { id: 'MistralAI-Training', provider: 'Mistral AI',  userAgents: ['MistralAI-Training'], categories: ['ai-training'],                verified: true },
  { id: 'MistralAI-Index',  provider: 'Mistral AI',    userAgents: ['MistralAI-Index'],  categories: ['ai-search'],                    verified: true },
  { id: 'MistralAI-User',   provider: 'Mistral AI',    userAgents: ['MistralAI-User'],   categories: ['ai-input'],                     verified: true },

  // ── xAI ─────────────────────────────────────────────────────────────────────
  { id: 'GrokBot',          provider: 'xAI',           userAgents: ['GrokBot'],          categories: ['ai-training'],                  verified: true },
  { id: 'xAI-Grok',         provider: 'xAI',           userAgents: ['xAI-Grok'],         categories: ['ai-input', 'ai-training'],      verified: true },

  // ── DeepSeek ────────────────────────────────────────────────────────────────
  { id: 'DeepSeekBot',      provider: 'DeepSeek',      userAgents: ['DeepSeekBot'],      categories: ['ai-training'],                  verified: true },

  // ── Moonshot AI (Kimi) ──────────────────────────────────────────────────────
  { id: 'KimiBot',          provider: 'Moonshot AI',   userAgents: ['KimiBot'],          categories: ['ai-training'],                  verified: true },
  { id: 'Kimi-SearchBot',   provider: 'Moonshot AI',   userAgents: ['Kimi-SearchBot'],   categories: ['ai-search'],                    verified: true },
  { id: 'Kimi-User',        provider: 'Moonshot AI',   userAgents: ['Kimi-User'],        categories: ['ai-input'],                     verified: true },

  // ── Alibaba ─────────────────────────────────────────────────────────────────
  { id: 'QwenBot',          provider: 'Alibaba',       userAgents: ['QwenBot'],          categories: ['ai-training'],                  verified: true },
  { id: 'TongyiBot',        provider: 'Alibaba',       userAgents: ['TongyiBot'],        categories: ['ai-input'],                     verified: true },

  // ── Tencent ─────────────────────────────────────────────────────────────────
  { id: 'Hunyuan',          provider: 'Tencent',       userAgents: ['Hunyuan'],          categories: ['ai-training'],                  verified: true },

  // ── Baidu ───────────────────────────────────────────────────────────────────
  { id: 'ERNIEBot',         provider: 'Baidu',         userAgents: ['ERNIEBot'],         categories: ['ai-training'],                  verified: true },

  // ── Huawei ──────────────────────────────────────────────────────────────────
  { id: 'PanguBot',         provider: 'Huawei',        userAgents: ['PanguBot'],         categories: ['ai-training'],                  verified: true },
  { id: 'PetalBot',         provider: 'Huawei',        userAgents: ['PetalBot'],         categories: ['ai-search', 'ai-input'],        verified: true },

  // ── Cohere ──────────────────────────────────────────────────────────────────
  { id: 'cohere-training-data-crawler', provider: 'Cohere', userAgents: ['cohere-training-data-crawler'], categories: ['ai-training'], verified: true },
  { id: 'cohere-ai',        provider: 'Cohere',        userAgents: ['cohere-ai'],        categories: ['ai-input'],                     verified: true },

  // ── ByteDance ───────────────────────────────────────────────────────────────
  { id: 'Bytespider',       provider: 'ByteDance',     userAgents: ['Bytespider'],       categories: ['ai-training'],                  verified: true },
  { id: 'TikTokSpider',     provider: 'ByteDance',     userAgents: ['TikTokSpider'],     categories: ['ai-training'],                  verified: true },
  { id: 'DoubaoBot',        provider: 'ByteDance',     userAgents: ['DoubaoBot'],        categories: ['ai-input'],                     verified: true },

  // ── Meta ────────────────────────────────────────────────────────────────────
  { id: 'meta-externalagent', provider: 'Meta',        userAgents: ['meta-externalagent'], categories: ['ai-input', 'ai-training'],   verified: true },
  { id: 'meta-externalfetcher', provider: 'Meta',      userAgents: ['meta-externalfetcher'], categories: ['ai-input'],               verified: true },
  { id: 'meta-webindexer',  provider: 'Meta',         userAgents: ['meta-webindexer'],   categories: ['ai-search'],                    verified: true },

  // ── Amazon ──────────────────────────────────────────────────────────────────
  { id: 'Amazonbot',        provider: 'Amazon',        userAgents: ['Amazonbot'],        categories: ['ai-search', 'ai-input'],        verified: true },
  { id: 'bedrockbot',       provider: 'Amazon',        userAgents: ['bedrockbot'],       categories: ['ai-input'],                     verified: true },

  // ── Apple ───────────────────────────────────────────────────────────────────
  { id: 'Applebot-Extended', provider: 'Apple',        userAgents: ['Applebot-Extended'], categories: ['ai-training'],                verified: true },

  // ── Yandex ──────────────────────────────────────────────────────────────────
  { id: 'YandexAdditional', provider: 'Yandex',        userAgents: ['YandexAdditional', 'YandexAdditionalBot'], categories: ['ai-training'], verified: true },

  // ── Research institutions ───────────────────────────────────────────────────
  { id: 'AI2Bot',           provider: 'Ai2',           userAgents: ['AI2Bot', 'Ai2Bot-Dolma'], categories: ['ai-training'],            verified: true },
  { id: 'ICC-Crawler',      provider: 'NICT',          userAgents: ['ICC-Crawler'],      categories: ['ai-training'],                  verified: true },

  // ── Kagi ────────────────────────────────────────────────────────────────────
  { id: 'kagi-fetcher',     provider: 'Kagi',          userAgents: ['kagi-fetcher'],     categories: ['ai-input'],                     verified: true },

  // ── Unknown / unverified AI ─────────────────────────────────────────────────
  { id: 'Diffbot',          provider: 'Diffbot',       userAgents: ['Diffbot'],          categories: ['unknown-ai'],                   verified: false },
  { id: 'Omgilibot',        provider: 'Webz.io',       userAgents: ['Omgilibot', 'omgili'], categories: ['unknown-ai'],                verified: false },
  { id: 'Webzio-Extended',  provider: 'Webz.io',       userAgents: ['Webzio-Extended'],  categories: ['unknown-ai'],                   verified: false },
  { id: 'ImagesiftBot',     provider: 'ImageSift',     userAgents: ['ImagesiftBot'],     categories: ['unknown-ai'],                   verified: false },
  { id: 'Timpibot',         provider: 'Timpi',         userAgents: ['Timpibot'],         categories: ['unknown-ai'],                   verified: false },
  { id: 'FirecrawlAgent',   provider: 'Firecrawl',     userAgents: ['FirecrawlAgent'],   categories: ['unknown-ai'],                   verified: false },
  { id: 'Crawlspace',       provider: 'Crawlspace',    userAgents: ['Crawlspace'],       categories: ['unknown-ai'],                   verified: false },
  { id: 'VelenPublicWebCrawler', provider: 'Velen',    userAgents: ['VelenPublicWebCrawler'], categories: ['unknown-ai'],              verified: false },

  // ── SEO scanners ────────────────────────────────────────────────────────────
  { id: 'AhrefsBot',        provider: 'Ahrefs',        userAgents: ['AhrefsBot'],        categories: ['seo-scanner'],                  verified: true },
  { id: 'SemrushBot',       provider: 'Semrush',       userAgents: ['SemrushBot'],       categories: ['seo-scanner'],                  verified: true },
  { id: 'MJ12bot',          provider: 'Majestic',      userAgents: ['MJ12bot'],          categories: ['seo-scanner'],                  verified: true },
  { id: 'DotBot',           provider: 'OpenLinkProfiler', userAgents: ['DotBot'],        categories: ['seo-scanner'],                  verified: true },
]
