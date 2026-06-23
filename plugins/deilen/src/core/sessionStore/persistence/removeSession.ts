import { rm } from "node:fs/promises";

import { sessionDir } from "../../../constants/paths.js";

/** Delete a session's entire directory: meta.json, viewer.md, feedback.json, images. */
export async function removeSession(sessionId: string): Promise<void> {
  await rm(sessionDir(sessionId), { recursive: true, force: true });
}
