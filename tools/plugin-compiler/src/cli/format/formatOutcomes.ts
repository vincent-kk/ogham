import { relative } from "node:path";
import type { FileOutcome } from "../../types/index.js";

const ACTION_COLUMN_WIDTH = 9;

export function formatOutcomes(
  outcomes: FileOutcome[],
  rootDirectory: string,
): string {
  const counts = new Map<string, number>();
  let lines = "";
  for (const outcome of outcomes) {
    counts.set(outcome.action, (counts.get(outcome.action) ?? 0) + 1);
    if (outcome.action !== "unchanged") {
      // Report a forward-slash repo-relative path on every OS — `relative` yields
      // backslashes on Windows, and CI logs (and its spec) read this one format.
      const rel = relative(rootDirectory, outcome.absolutePath).replaceAll(
        "\\",
        "/",
      );
      lines += `${outcome.action.padEnd(ACTION_COLUMN_WIDTH)} ${rel}\n`;
    }
  }
  const summary = [...counts.entries()]
    .map(([action, count]) => `${count} ${action}`)
    .join(", ");
  return `${lines}✓ sync: ${summary || "no targets"}\n`;
}
