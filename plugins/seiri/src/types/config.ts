import type { INTERVENTION_LEVELS } from '../constants/intervention.js';

/** One of the four dial positions. */
export type InterventionLevel = (typeof INTERVENTION_LEVELS)[number];

/**
 * Contents of a dial file — `<gitRoot>/.seiri/config.json` (project) or
 * `<hostStateRoot>/plugins/seiri/config.json` (user).
 *
 * The dial is the only thing seiri stores. Rule deployment state is NOT
 * mirrored here — `.claude/rules/` on disk is its single source of truth,
 * so a config copy could only ever drift away from it.
 */
export interface SeiriConfig {
  intervention: InterventionLevel;
}

/**
 * Which stored layer supplied the dial position in effect.
 *
 * `baseline` is the project layer — the dial a team commits. `user` is the
 * personal default beneath it, applying to every project the person opens.
 */
export type InterventionSource = 'runtime' | 'baseline' | 'user' | 'default';

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
  /**
   * In effect: runtime valve, else committed project baseline, else the
   * personal user default, else the built-in default.
   */
  effective: InterventionLevel;
  source: InterventionSource;
  /** `.seiri/config.json` — the project layer, or `null` when unusable. */
  baseline: InterventionLevel | null;
  /** The user layer, or `null` when absent or unusable. */
  user: InterventionLevel | null;
  /** `.seiri/runtime.json`, or `null` when absent or unusable. */
  runtime: InterventionLevel | null;
  /** Empty in the normal case. */
  warnings: InterventionWarning[];
}

/** Which namespace a dial file belongs to. */
export type SeiriConfigScope = 'user' | 'project';

/** Both dial layers as the settings page needs them. */
export interface ConfigScopeSnapshot {
  paths: { user: string; project: string };
  layers: { user: SeiriConfig | null; project: SeiriConfig | null };
  /**
   * `['intervention']` when the project layer sets the dial, else empty.
   * A list rather than a boolean so the page's badge logic matches every
   * other plugin's, which key off dot paths.
   */
  overridden: string[];
}

/** Result of reading one layer of a project's config. */
export interface LoadConfigResult {
  /** Parsed config, or `null` when that layer has none. */
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
