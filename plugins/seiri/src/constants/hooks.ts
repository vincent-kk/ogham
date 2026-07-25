/**
 * Claude Code hook events seiri subscribes to.
 *
 * A Bash command that exits non-zero fires `PostToolUseFailure`, not
 * `PostToolUse` — measured against the shipped client, whose public
 * reference documents the two as separate events. The failure-chain hook
 * therefore registers under both: one event to count on, one to reset on.
 */
export const HookEvent = {
  SESSION_START: 'SessionStart',
  USER_PROMPT_SUBMIT: 'UserPromptSubmit',
  POST_TOOL_USE: 'PostToolUse',
  POST_TOOL_USE_FAILURE: 'PostToolUseFailure',
  SUBAGENT_START: 'SubagentStart',
  INSTRUCTIONS_LOADED: 'InstructionsLoaded',
} as const;

/**
 * `bridge/<name>.mjs` basenames — every hook seiri builds.
 *
 * Two places carry these and neither can import this file: the
 * `hookEntries` list in `scripts/build-hooks.mjs` that builds them, and
 * each hook's error-log scope. The wiring test keeps them in step.
 * Whether a built hook is also *registered* in `hooks/hooks.json` is a
 * separate fact — see {@link DORMANT_HOOKS}.
 */
export const HookName = {
  SETUP: 'setup',
  USER_PROMPT_SUBMIT: 'user-prompt-submit',
  POST_TOOL_USE: 'post-tool-use',
  SUBAGENT_START: 'subagent-start',
  INSTRUCTIONS_LOADED: 'instructions-loaded',
} as const;

/**
 * Host tool names the PostToolUse matchers select on.
 *
 * `hooks.json` cannot import this file, so each name is stated twice: once
 * as a matcher there, once as the payload check here — the hook is
 * registered per tool and still verifies what it received. The wiring test
 * keeps the two copies in step.
 */
export const HostTool = {
  BASH: 'Bash',
  SKILL: 'Skill',
} as const;

/**
 * Hooks that are built but deliberately absent from `hooks/hooks.json`.
 *
 * `instructions-loaded` records which rule files reach the model — a
 * measurement device, not a delivery path. Its original goals (payload
 * schema, load verification) are met, `/context` already proved delivery,
 * and nothing consumes the log, so firing it every session is pure side
 * effect. The bundle stays built so re-measurement only needs its block
 * restored in `hooks.json`; the wiring test asserts it stays absent until
 * then.
 */
export const DORMANT_HOOKS: readonly string[] = [HookName.INSTRUCTIONS_LOADED];

/**
 * Announced from `standard` up: the order the automatic skills run in.
 *
 * It names skills, never their content — the skills carry their own
 * procedure, and restating any of it here would be the second copy the
 * whole delivery split exists to avoid. What the chain adds is routing:
 * which moment hands off to which, so a long session that has drifted
 * away from the sequence has something to snap back to.
 *
 * Written as `/seiri:<name>`, the form a reader can invoke and a model can
 * dispatch on. A bare name is a word; the namespaced one is an address.
 */
export const WORKFLOW_CHAIN_LINE =
  'Workflow: `/seiri:write-plan` → `/seiri:execute` → `/seiri:implement` → `/seiri:verify` → `/seiri:request-review`; failures → `/seiri:trace-cause`; indirect code → `/seiri:trace-structure`; review feedback → `/seiri:receive-review`.';

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
 *
 * It carries the election vocabulary of `ELECTION_STANDARD_LINE` and names
 * the same one skill it does: the done-claim moment, which the model
 * reaches by its own reckoning and therefore misses by its own reckoning.
 */
export const TURN_REMINDER_STANDARD =
  'This turn, elect before acting: a failure appearing, multi-step work starting, or review arriving or departing means loading the skill that owns the moment first — and before saying done, fixed, or passing, that skill is `/seiri:verify`. Keep changes within the active rules.';

/**
 * Strict widens the same reminder rather than replacing it: borderline and
 * small work still dispatch, and the rules bind rather than advise. Where
 * standard names one moment's owner, this names them all — the turn is
 * where a compaction has already dropped the SessionStart election line,
 * so the mapping has to survive without it.
 *
 * The repetition against `ELECTION_STRICT_LINE` is deliberate and is the
 * whole point of the strict position: once per session is not once per
 * turn, and the moment that decays is the one that arrives late.
 */
export const TURN_REMINDER_STRICT =
  'This turn, elect the owning skill by name — a failure → `/seiri:trace-cause` · multi-step work → `/seiri:write-plan` · a plan in hand → `/seiri:execute` · before implementing → `/seiri:implement` · before saying done, fixed, or passing → `/seiri:verify` · sending work out → `/seiri:request-review` · feedback arriving → `/seiri:receive-review`. Borderline and small work included; the active rules bind rather than advise.';
