import { mkdirSync } from "node:fs";

import type { EnsureDirectoryOptions } from "../types/types.js";

export function ensureDirectorySync(
  path: string,
  options: EnsureDirectoryOptions = {},
): void {
  mkdirSync(path, { recursive: true, mode: options.mode });
}
