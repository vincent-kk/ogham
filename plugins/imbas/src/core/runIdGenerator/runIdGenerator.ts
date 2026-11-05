/**
 * @file runIdGenerator.ts
 * @description Reserve run IDs using the local date and a minimum-width sequence
 */
import { mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { isRunId } from './utils/isRunId.js';

/**
 * Reserve an execution directory before exposing its run ID to a caller.
 * The runtime clock supplies today's local date for each invocation.
 * @param runsDir Parent directory of the project's runs; created if absent.
 * @returns A reserved ID with a numeric sequence padded to at least three digits.
 * @throws If the parent cannot be created/read or reservation fails except EEXIST.
 */
export function generateRunId(runsDir: string): string {
  const now = new Date();
  const datePart = formatDate(now);

  mkdirSync(runsDir, { recursive: true });
  const entries = readdirSync(runsDir);

  const prefix = `${datePart}-`;
  let maxSeq = 0n;

  for (const entry of entries)
    if (entry.startsWith(prefix) && isRunId(entry)) {
      const seq = BigInt(entry.slice(prefix.length));
      if (seq > maxSeq) maxSeq = seq;
    }

  for (let seq = maxSeq + 1n; ; seq += 1n) {
    const runId = `${datePart}-${String(seq).padStart(3, '0')}`;
    try {
      mkdirSync(join(runsDir, runId));
      return runId;
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !('code' in error) ||
        error.code !== 'EEXIST'
      )
        throw error;
    }
  }
}

/** Format the supplied runtime date into its local calendar day for an ID prefix. */
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}
