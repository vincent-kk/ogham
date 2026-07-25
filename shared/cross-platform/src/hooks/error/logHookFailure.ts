import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { errorLogPath } from "./errorLogPath.js";
import { serializeError } from "./serializeError.js";

const SIZE_CAP_BYTES = 256 * 1024;

interface ErrorEntry {
  timestamp: string;
  hook: string;
  error: string;
}

export interface LogHookFailureOptions {
  logFile?: string;
}

export function logHookFailure(
  pkg: string,
  hook: string,
  error: unknown,
  opts: LogHookFailureOptions = {},
): void {
  try {
    const file = opts.logFile ?? errorLogPath(pkg);
    mkdirSync(dirname(file), { recursive: true });

    let entries: ErrorEntry[] = [];
    if (existsSync(file))
      try {
        const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
        if (Array.isArray(parsed)) entries = parsed as ErrorEntry[];
      } catch {
        entries = [];
      }

    entries.push({
      timestamp: new Date().toISOString(),
      hook,
      error: serializeError(error),
    });

    let serialized = JSON.stringify(entries, null, 2);
    while (
      Buffer.byteLength(serialized) > SIZE_CAP_BYTES &&
      entries.length > 1
    ) {
      entries.shift();
      serialized = JSON.stringify(entries, null, 2);
    }

    writeFileSync(file, serialized);
  } catch {
    // A diagnostic side effect must never turn a recoverable hook failure into
    // a blocked session.
  }
}
