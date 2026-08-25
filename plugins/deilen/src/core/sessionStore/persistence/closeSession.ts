import { readFile } from "node:fs/promises";

import { sessionMetaPath } from "../../../constants/paths.js";
import { atomicWrite } from "../../../lib/atomicWrite.js";
import { SessionStatus } from "../../../types/enums.js";
import { SessionMetaSchema } from "../../../types/session.js";
import { isFileNotFound } from "../../../utils/isFileNotFound.js";
import { unregisterServing } from "../registry/servingSessions.js";

/** Mark a session closed in meta.json. Returns false when it does not exist. */
export async function closeSession(sessionId: string): Promise<boolean> {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(sessionMetaPath(sessionId), "utf8"));
  } catch (err) {
    if (isFileNotFound(err)) {
      unregisterServing(sessionId);
      return false;
    }
    throw err;
  }
  const parsed = SessionMetaSchema.safeParse(raw);
  if (!parsed.success) {
    unregisterServing(sessionId);
    return false;
  }
  await atomicWrite(
    sessionMetaPath(sessionId),
    `${JSON.stringify({ ...parsed.data, status: SessionStatus.Closed }, null, 2)}\n`,
  );
  unregisterServing(sessionId);
  return true;
}
