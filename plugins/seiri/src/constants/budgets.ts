/**
 * Standing-context budgets.
 *
 * Each of these bounds something the model carries whether or not it is
 * used, so they drift upward one reasonable-looking addition at a time.
 * `src/__tests__/size.test.ts` asserts them, which is what makes the next
 * addition a decision rather than an accident.
 */

/** Per-skill file size. A skill is a standing instruction, not a manual. */
export const SKILL_MAX_BYTES = 2048;

/**
 * Per-rule line count. Past this length adherence measurably drops, so a
 * rule that will not fit is a signal to split it, never to raise the cap.
 */
export const RULE_MAX_LINES = 200;

/** Skills that ship. A twelfth is a budget decision, not a detail. */
export const SHIPPED_SKILLS = [
  'brainstorm',
  'debug',
  'execute',
  'finish',
  'implement',
  'interview',
  'plan',
  'receive-review',
  'request-review',
  'setup',
  'verify',
] as const;
