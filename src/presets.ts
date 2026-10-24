import type { BotAction, Preset, RobotsOptions } from './types.js'

/**
 * Targets registry bots by training purpose, so a preset stays correct when the
 * registry grows. `only` matches bots whose sole AI purpose is model training;
 * `any` also matches dual-purpose bots that both answer prompts and train.
 */
export interface TrainingRule {
  scope: 'any' | 'only'
  action: BotAction
}

export type PresetConfig = Pick<RobotsOptions, 'groups' | 'bots'> & {
  training?: TrainingRule
  /**
   * Emit `Disallow: /` in the global `User-agent: *` group. Without it, a
   * crawler missing from the registry gets no rule at all and is free to crawl.
   */
  globalDisallow?: boolean
}

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
    training: { scope: 'only', action: 'disallow' },
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
    training: { scope: 'any', action: 'disallow' },
  },
  lockdown: {
    groups: {
      searchEngines: 'disallow',
      verifiedAi: 'disallow',
      unknownAi: 'disallow',
      seoScanners: 'disallow',
      archives: 'disallow',
    },
    globalDisallow: true,
  },
}

export type { BotAction }
