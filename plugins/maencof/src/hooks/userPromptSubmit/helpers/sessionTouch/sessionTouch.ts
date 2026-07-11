import { touchSessionActivity } from '../../../../core/sessionStore/operations/touchSessionActivity.js';
import { isMaencofVault } from '../../../shared/isMaencofVault.js';

export interface SessionTouchInput {
  session_id?: string;
  cwd?: string;
}

export interface SessionTouchResult {
  continue: boolean;
}

/**
 * Per-turn session activity touch. Keeps `lastActivityAt`/`usageSnapshot`
 * fresh so the MCP server sweep can close (and never mis-close) sessions
 * without knowing the hook's session_id at shutdown.
 */
export function runSessionTouch(input: SessionTouchInput): SessionTouchResult {
  const cwd = input.cwd;
  if (!cwd || !input.session_id) return { continue: true };
  if (!isMaencofVault(cwd)) return { continue: true };

  touchSessionActivity(cwd, input.session_id);
  return { continue: true };
}
