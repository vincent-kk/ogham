import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { FileOutcome, GeneratedFile } from "../../types/index.js";

/**
 * Thrown when a write fails partway through the file list (e.g.
 * ENOSPC/EACCES/EROFS). Carries the outcomes already applied so a caller can
 * report what changed before surfacing the failure.
 */
export class ApplyFilesError extends Error {
  readonly outcomes: FileOutcome[];

  constructor(message: string, outcomes: FileOutcome[]) {
    super(message);
    this.name = "ApplyFilesError";
    this.outcomes = outcomes;
  }
}

export function applyFiles(
  files: GeneratedFile[],
  check: boolean,
): FileOutcome[] {
  const outcomes: FileOutcome[] = [];
  for (const file of files) {
    const existing = existsSync(file.absolutePath)
      ? readFileSync(file.absolutePath, "utf8")
      : null;
    if (existing === file.content) {
      outcomes.push({ absolutePath: file.absolutePath, action: "unchanged" });
      continue;
    }
    if (check) {
      outcomes.push({
        absolutePath: file.absolutePath,
        action: existing === null ? "missing" : "stale",
      });
      continue;
    }
    try {
      mkdirSync(dirname(file.absolutePath), { recursive: true });
      writeFileSync(file.absolutePath, file.content, "utf8");
    } catch (error) {
      throw new ApplyFilesError(
        `${file.absolutePath}: ${error instanceof Error ? error.message : String(error)}`,
        outcomes,
      );
    }
    outcomes.push({
      absolutePath: file.absolutePath,
      action: existing === null ? "created" : "updated",
    });
  }
  return outcomes;
}
