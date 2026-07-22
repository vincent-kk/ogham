/**
 * Intervention dial. Changes the SessionStart render only — never the
 * deployed rule documents, whose bytes must keep matching templateHash.
 */
export const INTERVENTION_LEVELS = ['advisory', 'standard', 'strict'] as const;

/** Dial position applied when the project has no config of its own. */
export const DEFAULT_INTERVENTION = 'advisory' as const;
