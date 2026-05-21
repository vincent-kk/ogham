import { readFile } from 'node:fs/promises';

import { sessionPath } from '../../constants/paths.js';
import { logger } from '../../lib/logger.js';
import { type SessionMeta, SessionMetaSchema } from '../../types/index.js';
import { isFileNotFound } from '../../utils/isFileNotFound.js';

export async function getSession(
  projectHash: string,
  sessionId: string,
): Promise<SessionMeta | null> {
  let raw: unknown;
  try {
    const text = await readFile(sessionPath(projectHash, sessionId), 'utf8');
    raw = JSON.parse(text);
  } catch (err) {
    if (isFileNotFound(err)) return null;
    logger.warn('session file unreadable', {
      project_hash: projectHash,
      session_id: sessionId,
      error: (err as Error).message,
    });
    return null;
  }
  const parsed = SessionMetaSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn('session file invalid', {
      project_hash: projectHash,
      session_id: sessionId,
      issues: parsed.error.issues,
    });
    return null;
  }
  if (parsed.data.project_hash !== projectHash) {
    logger.warn('session project_hash mismatch', {
      expected: projectHash,
      found: parsed.data.project_hash,
      session_id: sessionId,
    });
    return null;
  }
  return parsed.data;
}
