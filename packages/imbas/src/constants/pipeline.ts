/**
 * @file constants/pipeline.ts
 * @description Pipeline phase, agent, and lifecycle constants
 */

import type { PhaseName } from '../types/state.js';

/** Ordered sequence of pipeline phases */
export const PHASE_ORDER: readonly PhaseName[] = ['validate', 'split', 'devplan'];

/** Prefix for imbas agent names */
export const AGENT_NAME_PREFIX = 'imbas-';

/** Agent-specific constraint messages injected via SubagentStart hook */
export const AGENT_CONSTRAINTS: Record<string, string> = {
  'imbas-analyst':
    '[imbas:analyst] Read-only analysis mode. Do NOT create or modify Jira issues. Return structured validation report only.',
  'imbas-planner':
    '[imbas:planner] Plan-then-Execute mode. Generate stories-manifest.json only — do NOT create Jira issues directly. All Jira writes go through /imbas:imbas-manifest.',
  'imbas-engineer':
    '[imbas:engineer] Code exploration mode. Generate devplan-manifest.json only — do NOT modify source code or create Jira issues directly.',
  'imbas-media':
    '[imbas:media] Media analysis mode. Read frame images, write analysis.json to .imbas/.temp/ only.',
};

/** Environment variable name for debug mode */
export const DEBUG_ENV_VAR = 'IMBAS_DEBUG';

/** Logger tag prefix */
export const LOGGER_PREFIX = 'imbas';

/** Default cache TTL in hours */
export const DEFAULT_CACHE_TTL_HOURS = 24;
