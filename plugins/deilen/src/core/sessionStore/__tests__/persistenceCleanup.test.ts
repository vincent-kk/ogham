import { mkdir, stat, utimes, writeFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  sessionDir,
  sessionFeedbackPath,
  sessionImagesDir,
  sessionViewerPath,
} from "../../../constants/paths.js";
import {
  clearCollectedFeedback,
  createSession,
  getSession,
  pruneExpired,
  readViewerMarkdown,
} from "../index.js";

describe("session persistence cleanup", () => {
  it("clears collected feedback artifacts but keeps the viewer until TTL prune", async () => {
    const sessionId = "rs_cleanup";
    const projectHash = "project-a";

    await createSession({
      sessionId,
      projectHash,
      title: "Cleanup",
      url: "http://127.0.0.1/r/rs_cleanup",
      markdown: "# Cleanup\n\nbody",
      createdAt: "2026-06-23T00:00:00.000Z",
    });
    await writeFile(
      sessionFeedbackPath(sessionId),
      JSON.stringify({ session_id: sessionId, status: "complete" }),
    );
    await mkdir(sessionImagesDir(sessionId), { recursive: true });
    await writeFile(`${sessionImagesDir(sessionId)}/img.png`, "png");

    await clearCollectedFeedback(sessionId);

    await expect(stat(sessionFeedbackPath(sessionId))).rejects.toThrow();
    await expect(stat(sessionImagesDir(sessionId))).rejects.toThrow();
    await expect(stat(sessionViewerPath(sessionId))).resolves.toBeTruthy();
    await expect(getSession(sessionId, projectHash)).resolves.toMatchObject({
      session_id: sessionId,
    });
    await expect(readViewerMarkdown(sessionId)).resolves.toBe(
      "# Cleanup\n\nbody",
    );

    const old = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await utimes(sessionDir(sessionId), old, old);

    await expect(pruneExpired(1)).resolves.toBeGreaterThanOrEqual(1);
    await expect(stat(sessionDir(sessionId))).rejects.toThrow();
  });
});
