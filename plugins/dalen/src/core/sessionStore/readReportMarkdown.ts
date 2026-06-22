import { readFile } from "node:fs/promises";

import { sessionReportPath } from "../../constants/paths.js";
import { isFileNotFound } from "../../utils/isFileNotFound.js";

/** Read the raw report.md for a session, or null when it is missing. */
export async function readReportMarkdown(
  sessionId: string,
): Promise<string | null> {
  try {
    return await readFile(sessionReportPath(sessionId), "utf8");
  } catch (err) {
    if (isFileNotFound(err)) return null;
    throw err;
  }
}
