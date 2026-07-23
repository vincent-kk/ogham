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
  INSTRUCTIONS_LOADED: 'InstructionsLoaded',
  POST_TOOL_USE: 'PostToolUse',
  POST_TOOL_USE_FAILURE: 'PostToolUseFailure',
  SUBAGENT_START: 'SubagentStart',
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
  INSTRUCTIONS_LOADED: 'instructions-loaded',
  POST_TOOL_USE: 'post-tool-use',
  SUBAGENT_START: 'subagent-start',
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
