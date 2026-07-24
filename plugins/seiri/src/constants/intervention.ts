/**
 * Intervention dial. Changes the SessionStart render only — never the
 * deployed rule documents, whose bytes must keep matching templateHash.
 */
export const INTERVENTION_LEVELS = ['advisory', 'standard', 'strict'] as const;

/** Dial position applied when the project has no config of its own. */
export const DEFAULT_INTERVENTION = 'advisory' as const;

/**
 * Announced from `standard` up: the order the automatic skills run in.
 *
 * It names skills, never their content — the skills carry their own
 * procedure, and restating any of it here would be the second copy the
 * whole delivery split exists to avoid. What the chain adds is routing:
 * which moment hands off to which, so a long session that has drifted
 * away from the sequence has something to snap back to.
 */
export const WORKFLOW_CHAIN_LINE =
  'Workflow: write-plan → execute → implement → verify-done → request-review; failures → trace-cause; indirect code → trace-structure; review feedback → receive-review.';

/**
 * Added at `strict`. Widens which moments count as one of the above, and
 * puts a verification run behind any claim that something is done.
 */
export const STRICT_POSTURE_LINE =
  'Borderline moments included. Completion claims name their verification run first.';
