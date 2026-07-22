import type { INTERVENTION_LEVELS } from '../constants/intervention.js';

/** One of the three dial positions. */
export type InterventionLevel = (typeof INTERVENTION_LEVELS)[number];

/**
 * Contents of `<gitRoot>/.seiri/config.json`.
 *
 * The dial is the only thing seiri stores. Rule deployment state is NOT
 * mirrored here — `.claude/rules/` on disk is its single source of truth,
 * so a config copy could only ever drift away from it.
 */
export interface SeiriConfig {
  intervention: InterventionLevel;
}

/** Result of reading a project's config. */
export interface LoadConfigResult {
  /** Parsed config, or `null` when the project has none. */
  config: SeiriConfig | null;
  /** Absolute path that was inspected. */
  path: string;
  /**
   * Populated when a file existed but could not be used as written —
   * unreadable, malformed JSON, or an unknown dial position. The caller
   * falls back to defaults; the warning explains why.
   */
  warning?: string;
}
