import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const SIZE_CAP_BYTES = 256 * 1024;

interface ErrorEntry {
  timestamp: string;
  hook: string;
  error: string;
}

function defaultLogPath(pkg: string): string {
  return join(homedir(), ".claude", "plugins", pkg, "error-log.json");
}

function serialize(error: unknown): string {
  if (error instanceof Error)
    return `${error.message}${error.stack ? `\n${error.stack}` : ""}`;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
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
  const file = opts.logFile ?? defaultLogPath(pkg);
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
    error: serialize(error),
  });

  let serialized = JSON.stringify(entries, null, 2);
  while (Buffer.byteLength(serialized) > SIZE_CAP_BYTES && entries.length > 1) {
    entries.shift();
    serialized = JSON.stringify(entries, null, 2);
  }

  writeFileSync(file, serialized);
}
