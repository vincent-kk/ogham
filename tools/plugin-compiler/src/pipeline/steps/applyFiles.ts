import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { FileOutcome, GeneratedFile } from "../../types/index.js";

export function applyFiles(
  files: GeneratedFile[],
  check: boolean,
): FileOutcome[] {
  return files.map((file) => {
    const existing = existsSync(file.absolutePath)
      ? readFileSync(file.absolutePath, "utf8")
      : null;
    if (existing === file.content)
      return { absolutePath: file.absolutePath, action: "unchanged" };
    if (check)
      return {
        absolutePath: file.absolutePath,
        action: existing === null ? "missing" : "stale",
      };
    mkdirSync(dirname(file.absolutePath), { recursive: true });
    writeFileSync(file.absolutePath, file.content, "utf8");
    return {
      absolutePath: file.absolutePath,
      action: existing === null ? "created" : "updated",
    };
  });
}
