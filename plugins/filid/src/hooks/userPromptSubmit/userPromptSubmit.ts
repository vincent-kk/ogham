import { removeFractalMap } from '../../core/infra/cacheManager/caches/fractalMapCache.js';
import { incrementTurn } from '../../core/infra/cacheManager/caches/turnCounter.js';
import type { HookOutput, UserPromptSubmitInput } from '../../types/hooks.js';
import { isFcaProject } from '../shared/utils/isFcaProject.js';
import { validateCwd } from '../utils/validateCwd.js';

import { injectContext } from './utils/injectContext.js';

/**
 * UserPromptSubmit hook orchestrator.
 *
 * 1. Per-turn fmap reset (incl. subagent-scoped maps) + turn-counter
 *    increment (the delivery-TTL clock consumed by the visit pipeline).
 * 2. Session-first FCA-AI rules pointer injection.
 *
 * Validation (validateCwd + isFcaProject) runs exactly once here; the
 * collaborator `injectContext` trusts the validated cwd.
 *
 * Never blocks user prompts (always { continue: true }).
 */
export function handleUserPromptSubmit(
  input: UserPromptSubmitInput,
): HookOutput {
  const cwd = validateCwd(input.cwd);
  if (cwd === null || !isFcaProject(cwd)) return { continue: true };

  removeFractalMap(cwd, input.session_id);
  incrementTurn(cwd, input.session_id);
  return injectContext(cwd, input.session_id);
}
