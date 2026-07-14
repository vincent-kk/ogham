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
    if (outcome.action !== "unchanged")
      lines += `${outcome.action.padEnd(ACTION_COLUMN_WIDTH)} ${relative(rootDirectory, outcome.absolutePath)}\n`;
  }
  const summary = [...counts.entries()]
    .map(([action, count]) => `${count} ${action}`)
    .join(", ");
  return `${lines}✓ sync: ${summary || "no targets"}\n`;
}
