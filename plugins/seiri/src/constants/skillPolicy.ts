/**
 * How each shipped skill may be invoked, and whether it may interrupt with
 * a question. The partition is the contract `skillPolicy.test.ts` enforces
 * against every `SKILL.md` frontmatter, so a new skill cannot land without
 * a deliberate answer to "who invokes this, and may it ask?" — the same
 * decision-not-accident discipline `SHIPPED_SKILLS` applies to the count.
 *
 * Every skill belongs to exactly one list, and the union is `SHIPPED_SKILLS`.
 */

/**
 * Auto-invocable disciplines that must never stop to ask. They run mid-work,
 * where an `AskUserQuestion` popup would break the flow the skill exists to
 * hold; each carries `disallowed-tools: AskUserQuestion` and takes the
 * conservative default instead. A genuine blocker is reported, not asked.
 */
export const AUTO_NO_ASK_SKILLS = [
  'execute',
  'implement',
  'receive-review',
  'request-review',
  'trace-cause',
  'trace-structure',
  'verify-done',
] as const;

/**
 * Auto-invocable, but permitted to ask when the blast radius is large — a
 * broad refactor, a new module or feature — so a wrong planning default does
 * not propagate into execution. Carries neither `disallowed-tools` nor
 * `disable-model-invocation`: the model may invoke it, and it may ask.
 */
export const AUTO_CONDITIONAL_ASK_SKILLS = ['write-plan'] as const;

/**
 * User-invoked gates the model may not auto-invoke (`disable-model-invocation:
 * true`). They own the interactive decision points — shaping, requirements,
 * the integration choice, rule deployment — and so may ask freely.
 */
export const USER_GATED_SKILLS = [
  'brainstorm',
  'finish',
  'interview',
  'setup',
] as const;

/** Every skill the model may invoke on its own — the workflow-chain members. */
export const AUTO_INVOCABLE_SKILLS = [
  ...AUTO_NO_ASK_SKILLS,
  ...AUTO_CONDITIONAL_ASK_SKILLS,
] as const;
