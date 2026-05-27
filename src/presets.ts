import type { BotAction, Preset, RobotsOptions } from './types.js'

type PresetConfig = Pick<RobotsOptions, 'groups' | 'bots'>

export const PRESETS: Record<Preset, PresetConfig> = {
  seoOnly: {
    groups: {
      searchEngines: 'allow',
      verifiedAi: 'disallow',
      unknownAi: 'disallow',
      seoScanners: 'inherit',
      archives: 'disallow',
    },
  },
  citationFriendly: {
    groups: {
      searchEngines: 'allow',
      verifiedAi: 'allow',
      unknownAi: 'disallow',
      seoScanners: 'inherit',
      archives: 'inherit',
    },
    bots: {
      GPTBot: 'disallow',
      'Google-Extended': 'disallow',
      CCBot: 'disallow',
      Bytespider: 'disallow',
      'Applebot-Extended': 'disallow',
    },
  },
  openToAi: {
    groups: {
      searchEngines: 'allow',
      verifiedAi: 'allow',
      unknownAi: 'allow',
      seoScanners: 'inherit',
      archives: 'allow',
    },
  },
  blockTraining: {
    groups: {
      searchEngines: 'allow',
      verifiedAi: 'allow',
      unknownAi: 'disallow',
      seoScanners: 'inherit',
      archives: 'disallow',
    },
    bots: {
      GPTBot: 'disallow',
      ClaudeBot: 'disallow',
      'anthropic-ai': 'disallow',
      'Google-Extended': 'disallow',
      CCBot: 'disallow',
      Bytespider: 'disallow',
      'meta-externalagent': 'disallow',
      'Applebot-Extended': 'disallow',
    },
  },
  lockdown: {
    groups: {
      searchEngines: 'disallow',
      verifiedAi: 'disallow',
      unknownAi: 'disallow',
      seoScanners: 'disallow',
      archives: 'disallow',
    },
  },
}

export type { BotAction }
