import { rm } from "node:fs/promises";

import {
  sessionFeedbackPath,
  sessionImagesDir,
} from "../../../constants/paths.js";

/** Delete collected feedback artifacts while preserving meta.json and viewer.md. */
export async function clearCollectedFeedback(sessionId: string): Promise<void> {
  await Promise.all([
    rm(sessionFeedbackPath(sessionId), { force: true }),
    rm(sessionImagesDir(sessionId), { recursive: true, force: true }),
  ]);
}
