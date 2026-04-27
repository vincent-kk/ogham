/**
 * session-cleanup.ts — SessionEnd hook for cleaning up session cache files.
 *
 * Removes session-context-{hash} marker and cached-context-{hash} cache
 * created by the user-prompt-submit hook when the session ends.
 */
import { removeSessionFiles } from '../../core/infra/cache-manager/cache-manager.js';
import type { HookOutput, SessionEndInput } from '../../types/hooks.js';
import { validateCwd } from '../utils/validate-cwd.js';

/**
 * SessionEnd hook: remove the current session's cache files.
 *
 * Never blocks session termination (always continue: true).
 */
export function cleanupSession(input: SessionEndInput): HookOutput {
  const safeCwd = validateCwd(input.cwd);
  if (safeCwd === null) return { continue: true };
  removeSessionFiles(input.session_id, safeCwd);
  return { continue: true };
}
