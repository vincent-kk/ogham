import { readFile } from "node:fs/promises";

import { sessionMetaPath } from "../../constants/paths.js";
import { logger } from "../../lib/logger.js";
import { type SessionMeta, SessionMetaSchema } from "../../types/session.js";
import { isFileNotFound } from "../../utils/isFileNotFound.js";

/**
 * Load a session's meta.json, enforcing the project_hash scope. Returns null for
 * a missing, unreadable, invalid, or out-of-scope session.
 */
export async function getSession(
  sessionId: string,
  projectHash: string,
): Promise<SessionMeta | null> {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(sessionMetaPath(sessionId), "utf8"));
  } catch (err) {
    if (isFileNotFound(err)) return null;
    logger.warn("session meta unreadable", {
      session_id: sessionId,
      error: (err as Error).message,
    });
    return null;
  }
  const parsed = SessionMetaSchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn("session meta invalid", { session_id: sessionId });
    return null;
  }
  if (parsed.data.project_hash !== projectHash) {
    logger.warn("session project_hash mismatch", { session_id: sessionId });
    return null;
  }
  return parsed.data;
}
