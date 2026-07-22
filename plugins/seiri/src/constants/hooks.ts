/** Claude Code hook events seiri subscribes to. */
export const HookEvent = {
  SESSION_START: 'SessionStart',
  INSTRUCTIONS_LOADED: 'InstructionsLoaded',
} as const;

/**
 * `bridge/<name>.mjs` basenames.
 *
 * Three places carry these: `hooks/hooks.json`, the `hookEntries` list in
 * `scripts/build-hooks.mjs`, and the error-log scope below. The first two
 * are JSON and a build script, so neither can import this file — the
 * wiring test is what keeps all three in step.
 */
export const HookName = {
  SETUP: 'setup',
  INSTRUCTIONS_LOADED: 'instructions-loaded',
} as const;
