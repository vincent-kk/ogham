import { removeFractalMap } from '../../core/infra/cacheManager/cacheManager.js';
import type { HookOutput, UserPromptSubmitInput } from '../../types/hooks.js';
import { isFcaProject } from '../shared/shared.js';
import { validateCwd } from '../utils/validateCwd.js';

import { buildSpikeBanner } from './utils/buildSpikeBanner.js';
import { injectContext } from './utils/injectContext.js';

/**
 * UserPromptSubmit hook orchestrator.
 *
 * 1. Per-turn fmap reset (so INTENT.md is re-injected on next PreToolUse).
 * 2. Session-first FCA-AI rules pointer injection.
 * 3. Spike banner — cache-EXEMPT, evaluated fresh on every prompt (mode can
 *    flip mid-session via checkout; a stale banner is a brain-split).
 *
 * Validation (validateCwd + isFcaProject) runs exactly once here; the
 * collaborators `injectContext` / `buildSpikeBanner` trust the validated cwd.
 *
 * Never blocks user prompts (always { continue: true }).
 */
export function handleUserPromptSubmit(
  input: UserPromptSubmitInput,
): HookOutput {
  const cwd = validateCwd(input.cwd);
  if (cwd === null || !isFcaProject(cwd)) return { continue: true };

  removeFractalMap(cwd, input.session_id);
  const base = injectContext(cwd, input.session_id);

  const banner = buildSpikeBanner(cwd);
  if (banner === null) return base;

  const merged = [base.hookSpecificOutput?.additionalContext, banner]
    .filter(
      (part): part is string => typeof part === 'string' && part.length > 0,
    )
    .join('\n');
  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: merged,
    },
  };
}
