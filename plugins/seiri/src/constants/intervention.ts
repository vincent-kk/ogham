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

/**
 * The per-turn reminder the UserPromptSubmit hook re-raises at the top of
 * every turn. SessionStart states the posture once; a long session scrolls
 * it away and a compaction drops it, so this restores the one fact that
 * decays — that a moment may call for a skill — at the moment work begins.
 *
 * Skill dispatch is the leading axis on purpose. The failure this closes is
 * "the moment arrived and no skill fired", so the line maps moments to
 * skills first and lets the rule reminder ride second. Silent at advisory —
 * the level the dispatch rates were measured against — where the hook reads
 * the dial and returns without injecting.
 */
export const TURN_REMINDER_STANDARD =
  'Before acting this turn, dispatch the skill the moment matches — a failing test → trace-cause, multi-step work → write-plan, a "done" claim → verify-done — and keep changes within the active rules.';

/**
 * Strict widens the same reminder rather than replacing it: borderline and
 * small work still dispatch, a completion names its verification, and the
 * rules bind rather than advise. It intentionally echoes the strict
 * SessionStart posture — the session injection carries the fuller
 * instruction, this restates its core each turn.
 */
export const TURN_REMINDER_STRICT =
  'This turn: dispatch the matching skill even for borderline or small work, name a verification run before any completion claim, and treat the active rules as binding — not advisory.';
