import { readFile } from "node:fs/promises";

import { sessionViewerPath } from "../../../constants/paths.js";
import { isFileNotFound } from "../../../utils/isFileNotFound.js";

/** Read the raw viewer.md for a session, or null when it is missing. */
export async function readViewerMarkdown(
  sessionId: string,
): Promise<string | null> {
  try {
    return await readFile(sessionViewerPath(sessionId), "utf8");
  } catch (err) {
    if (isFileNotFound(err)) return null;
    throw err;
  }
}
