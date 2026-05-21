import type { ConversationError } from '../../../types/index.js';
import { mapError } from '../../errorMap/index.js';
import {
  findSessionByUuid,
  parseListSessions,
} from '../sessionResolver/index.js';
import { spawnGemini } from '../spawn.js';

export async function resolveResumeIndex(
  cwd: string,
  uuid: string,
): Promise<{ index: number | null; error: ConversationError | null }> {
  const result = await spawnGemini(['--list-sessions'], { cwd });
  if (result.spawnError !== null || result.exitCode !== 0) {
    return {
      index: null,
      error: mapError({
        exitCode: result.exitCode,
        stderr: result.stderr,
        spawnError: result.spawnError,
      }),
    };
  }
  const entry = findSessionByUuid(parseListSessions(result.stdout), uuid);
  if (!entry) {
    return {
      index: null,
      error: {
        code: 'unknown',
        message:
          'gemini session UUID not found in current --list-sessions output',
      },
    };
  }
  return { index: entry.index, error: null };
}
