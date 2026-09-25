/** Native shell tool name shared by the two supported hook ABIs. */
export const BASH_TOOL = 'Bash';

/** The failure event name bashOutcome.ts compares against. */
export const POST_TOOL_FAILURE_EVENT = 'PostToolUseFailure';

/**
 * Hook events seiri subscribes to, across both supported host ABIs (Claude
 * Code and Codex).
 *
 * A Bash command that exits non-zero fires `PostToolUseFailure`, not
 * `PostToolUse` — measured against the shipped client, whose public
 * reference documents the two as separate events. The failure-chain hook
 * therefore registers under both: one event to count on, one to reset on.
 */
export const HookEvent = {
  SESSION_START: 'SessionStart',
  USER_PROMPT_SUBMIT: 'UserPromptSubmit',
  PRE_TOOL_USE: 'PreToolUse',
  POST_TOOL_USE: 'PostToolUse',
  POST_TOOL_USE_FAILURE: POST_TOOL_FAILURE_EVENT,
  SUBAGENT_START: 'SubagentStart',
  INSTRUCTIONS_LOADED: 'InstructionsLoaded',
} as const;

/**
 * `bridge/claude/<name>.mjs` / `bridge/codex/<name>.mjs` basenames — every hook seiri builds.
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
  PRE_TOOL_USE: 'pre-tool-use',
  POST_TOOL_USE: 'post-tool-use',
  SUBAGENT_START: 'subagent-start',
  INSTRUCTIONS_LOADED: 'instructions-loaded',
} as const;

/**
 * Host tool names the PreToolUse/PostToolUse matchers select on.
 *
 * `hooks.json` cannot import this file, so each name is stated twice: once
 * as a matcher there, once as the payload check here. This constant pins
 * the names `src/__tests__/wiring.test.ts` checks against `hooks.json` to
 * keep the two in step.
 */
export const HostTool = {
  BASH: BASH_TOOL,
  WORKFLOW: 'mcp__plugin_seiri_tools__workflow',
} as const;

/**
 * Codex's server-prefixed form of {@link HostTool.WORKFLOW}.
 *
 * The plugin compiler's Codex adapter rewrites the Claude MCP address into
 * this shape at build time; this constant pins the value both hosts' hook
 * ABIs match against, sourced here alongside `HostTool` rather than
 * restated in the Codex workflow adapter.
 */
export const CODEX_WORKFLOW_TOOL = 'mcp__seiri__workflow' as const;

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
