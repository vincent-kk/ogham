import type { ConversationError } from '../../../types/index.js';
import { mapError } from '../../errorMap/index.js';
import { spawnGemini } from '../operations/spawn.js';
import {
  findLatestSession,
  parseListSessions,
} from '../sessionResolver/index.js';

export async function captureSessionUuid(
  cwd: string,
): Promise<{ uuid: string | null; error: ConversationError | null }> {
  const result = await spawnGemini(['--list-sessions'], { cwd });
  if (result.spawnError !== null || result.exitCode !== 0) {
    return {
      uuid: null,
      error: mapError({
        exitCode: result.exitCode,
        stderr: result.stderr,
        spawnError: result.spawnError,
      }),
    };
  }
  const latest = findLatestSession(parseListSessions(result.stdout));
  if (!latest) {
    return {
      uuid: null,
      error: {
        code: 'unknown',
        message: 'gemini --list-sessions returned no entries after start',
      },
    };
  }
  return { uuid: latest.sessionId, error: null };
}
