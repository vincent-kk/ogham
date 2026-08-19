/**
 * How each shipped skill may be invoked, and how it handles user questions.
 * The partition is the contract `skillPolicy.test.ts` enforces against
 * every `SKILL.md` frontmatter and canonical body clause, so a new skill
 * cannot land without a deliberate answer to "who invokes this, and when
 * may it ask?" — the same decision-not-accident discipline `SHIPPED_SKILLS`
 * applies to the count.
 *
 * Every skill belongs to exactly one list, and the union is `SHIPPED_SKILLS`.
 */

/**
 * Auto-invocable disciplines that prefer autonomous judgment. They run
 * mid-work, where a routine question would break the flow the skill exists
 * to hold; each takes the conservative default and discloses it in one
 * line. A genuine blocker — a decision only the user can resolve — earns
 * one crisp `AskUserQuestion`; a routine checkpoint does not. The canonical
 * body clause carries this contract; no frontmatter tool ban is used, as a
 * ban is turn-scoped and cannot stop a plain-text question anyway.
 */
export const AUTO_AUTONOMOUS_SKILLS = [
  'execute',
  'implement',
  'receive-review',
  'request-review',
  'trace-cause',
  'trace-structure',
  'verify',
] as const;

/**
 * Auto-invocable, and permitted to ask proactively at the one decision
 * point each names in its body — no blocker required. Both act before
 * execution, the cheap moment to be wrong, so one focused question is
 * worth the interrupt: write-plan's on a large blast radius before the
 * plan is committed, review-plan's on a challenge trigger — delegate the
 * review to unprejudiced eyes, or proceed on grounding alone.
 */
export const AUTO_CONDITIONAL_ASK_SKILLS = [
  'review-plan',
  'write-plan',
] as const;

/**
 * User-invoked gates the model may not auto-invoke (`disable-model-invocation:
 * true`). They own the moments the user starts deliberately — shaping,
 * requirements, model building, the work-opening PR shell, the integration
 * choice, rule deployment, the reader-facing change explanation — and so may
 * ask freely.
 */
export const USER_GATED_SKILLS = [
  'brainstorm',
  'finish',
  'interview',
  'mental-model',
  'scaffold-pr',
  'setup',
  'trace-change',
] as const;

/** Every skill the model may invoke on its own — the workflow-chain members. */
export const AUTO_INVOCABLE_SKILLS = [
  ...AUTO_AUTONOMOUS_SKILLS,
  ...AUTO_CONDITIONAL_ASK_SKILLS,
] as const;
