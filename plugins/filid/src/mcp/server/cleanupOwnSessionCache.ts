import { removeSessionFiles } from '../../core/infra/cacheManager/cacheManager.js';

/**
 * Eagerly remove this session's cache files at server shutdown. Strictly
 * synchronous — the host SIGKILLs the process ~400ms after SIGINT (measured).
 * `CLAUDE_CODE_SESSION_ID` is an undocumented env var: when absent (other
 * hosts, future Claude versions) skip silently; the boot sweep then covers
 * the files by TTL.
 */
export function cleanupOwnSessionCache(): void {
  try {
    const sessionId = process.env.CLAUDE_CODE_SESSION_ID;
    if (sessionId) removeSessionFiles(sessionId, process.cwd());
  } catch {
    // cleanup failure must never affect the exit path
  }
}
