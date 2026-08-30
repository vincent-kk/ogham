import type { SHIPPED_SKILLS } from './budgets.js';

/**
 * How each shipped skill may be invoked, and how it handles user questions.
 * The partition is the contract `skillPolicy.test.ts` enforces against
 * every `SKILL.md` frontmatter and canonical body clause, so a new skill
 * cannot land without a deliberate answer to "who invokes this, and when
 * may it ask?" — the same decision-not-accident discipline `SHIPPED_SKILLS`
 * applies to the count.
 *
 * Every skill belongs to exactly one list, and the union is `SHIPPED_SKILLS`.
 * Catalog visibility and workflow election are separate axes: a user-started
 * skill can remain visible to the model without joining the workflow chain.
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
 * worth the interrupt: write-plan's on conflicting planning methods or a
 * high-blast-radius choice its selected method leaves unresolved;
 * review-plan's on a challenge trigger — delegate the review to
 * unprejudiced eyes, or proceed on grounding alone.
 */
export const AUTO_CONDITIONAL_ASK_SKILLS = [
  'review-plan',
  'write-plan',
] as const;

/**
 * User-started skills kept in the model catalog so an explicit mention can
 * resolve to the skill. They do not join the standard workflow chain: the
 * user's request starts them, and they may ask freely once loaded.
 */
export const VISIBLE_USER_STARTED_SKILLS = [
  'architect',
  'brainstorm',
  'clarify-request',
  'finish',
  'mental-model',
  'trace-change',
] as const;

/**
 * User-only gates hidden from the model catalog with
 * `disable-model-invocation: true` because running them requires an explicit
 * slash-command decision.
 */
export const HIDDEN_USER_ONLY_SKILLS = ['scaffold-pr', 'setup'] as const;

/** Every skill elected by the standard workflow chain. */
export const WORKFLOW_INVOCABLE_SKILLS = [
  ...AUTO_AUTONOMOUS_SKILLS,
  ...AUTO_CONDITIONAL_ASK_SKILLS,
] as const;

/**
 * Skills that leave a Markdown document behind — a plan, its review
 * verdict, a decision record, a clarified scope. A cross-cutting axis, not
 * a partition: each name also belongs to exactly one invocation list
 * above. Every member carries the document-language clause
 * `skillPolicy.test.ts` checks verbatim, so a document follows the
 * session's response language rather than the language the skill's own
 * template is written in. Deliberately absent: the gate ledger takes its
 * rule from `skills/execute/references/gates-format.md`; HTML articles
 * follow their named reader; PR titles and review hand-offs follow the
 * repository's conventions. `satisfies` rejects a stranger.
 */
export const DOCUMENT_WRITING_SKILLS = [
  'architect',
  'brainstorm',
  'clarify-request',
  'review-plan',
  'write-plan',
] as const satisfies readonly (typeof SHIPPED_SKILLS)[number][];
