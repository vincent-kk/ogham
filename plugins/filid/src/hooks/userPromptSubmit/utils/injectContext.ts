/**
 * injectContext.ts — FCA-AI rules pointer builder + session-first emitter.
 *
 * Output contract (session first prompt only):
 *   1. Action-path pointer to the active rule doc, OR a warning when the
 *      rule doc is not yet deployed / the project is not initialised.
 *   2. `[filid:lang] <lang>` language tag.
 *   3. Optional `[filid] Disabled rules: <ids>` line when overrides disabled
 *      any built-in rule.
 *
 * Deployed rule docs are read by the active host from its project rule target.
 * This module MUST NOT duplicate their content, only point to the inspected
 * target so the LLM can re-read it.
 *
 * Callers (see `userPromptSubmit.ts`) are responsible for the
 * validateCwd + isFcaProject gate before invoking `injectContext`.
 */
import {
  hasPromptContext,
  isFirstInSession,
  markSessionInjected,
  writePromptContext,
} from '../../../core/infra/cacheManager/cacheManager.js';
import type { HookOutput } from '../../../types/hooks.js';

import { buildMinimalContext } from './buildMinimalContext.js';

/**
 * Session-first FCA-AI pointer injection.
 *
 * Skips when prompt-context cache exists (already injected in this session).
 * On first run, persists both session marker and prompt-context cache.
 */
export function injectContext(cwd: string, sessionId: string): HookOutput {
  if (!isFirstInSession(sessionId, cwd) && hasPromptContext(sessionId, cwd))
    return { continue: true };

  const additionalContext = buildMinimalContext(cwd);

  writePromptContext(cwd, additionalContext, sessionId);
  markSessionInjected(sessionId, cwd);

  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext,
    },
  };
}
