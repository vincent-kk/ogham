import { removeFractalMap } from '../core/cache-manager.js';
import type { HookOutput, UserPromptSubmitInput } from '../types/hooks.js';
import { injectContext } from './context-injector.js';
import { isFcaProject } from './shared.js';

/**
 * Unified UserPromptSubmit hook orchestrator.
 * Runs per-turn state reset + context injection in a single process.
 *
 * 1. Clears per-turn fmap state (so INTENT.md is re-injected on next PreToolUse)
 * 2. Delegates to injectContext for session-scoped FCA-AI rules injection
 */
export function handleUserPromptSubmit(
  input: UserPromptSubmitInput,
): HookOutput {
  // 1. Per-turn fmap reset (only for FCA projects)
  if (isFcaProject(input.cwd)) {
    removeFractalMap(input.cwd, input.session_id);
  }

  // 2. FCA-AI context injection (session-scoped rules, first prompt only)
  return injectContext(input);
}
