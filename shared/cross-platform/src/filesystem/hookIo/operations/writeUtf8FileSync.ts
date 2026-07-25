import { writeFileSync } from "node:fs";

export function writeUtf8FileSync(path: string, content: string): void {
  writeFileSync(path, content, "utf8");
}
