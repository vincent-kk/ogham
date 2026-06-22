import { readFile } from "node:fs/promises";

import { sessionFeedbackPath } from "../../constants/paths.js";
import { logger } from "../../lib/logger.js";
import {
  type StoredFeedback,
  StoredFeedbackSchema,
} from "../../types/feedback.js";
import { isFileNotFound } from "../../utils/isFileNotFound.js";

/** Read a session's persisted feedback, or null when none exists yet. */
export async function readFeedback(
  sessionId: string,
): Promise<StoredFeedback | null> {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(sessionFeedbackPath(sessionId), "utf8"));
  } catch (err) {
    if (isFileNotFound(err)) return null;
    logger.warn("feedback.json unreadable", {
      session_id: sessionId,
      error: (err as Error).message,
    });
    return null;
  }
  const parsed = StoredFeedbackSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
