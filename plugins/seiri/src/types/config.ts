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

/** Which stored layer supplied the dial position in effect. */
export type InterventionSource = 'runtime' | 'baseline' | 'default';

/** A stored dial file that existed but could not be used as written. */
export interface InterventionWarning {
  /** Display label of the ignored file, e.g. `.seiri/runtime.json`. */
  file: string;
  /** Why it was ignored, phrased to follow an em dash. */
  reason: string;
}

/**
 * The dial as both layers resolve it.
 *
 * `effective` is the only value behaviour keys off; the rest exists so a
 * render can say where that value came from. A session valve that
 * silently outranked the committed baseline would look like the
 * repository changing its mind on its own.
 */
export interface InterventionState {
  /** In effect: runtime valve, else committed baseline, else the default. */
  effective: InterventionLevel;
  source: InterventionSource;
  /** `.seiri/config.json`, or `null` when absent or unusable. */
  baseline: InterventionLevel | null;
  /** `.seiri/runtime.json`, or `null` when absent or unusable. */
  runtime: InterventionLevel | null;
  /** Empty in the normal case. */
  warnings: InterventionWarning[];
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
