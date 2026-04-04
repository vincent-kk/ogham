/**
 * @file core/run-id-generator.ts
 * @description Generate collision-safe run IDs in YYYYMMDD-NNN format
 */
import { mkdirSync, readdirSync } from 'node:fs';

/**
 * Generate a run ID in YYYYMMDD-NNN format.
 * Scans existing directories in runsDir to find max NNN for today, increments.
 */
export function generateRunId(runsDir: string): string {
  const now = new Date();
  const datePart = formatDate(now);

  let entries: string[];
  try {
    mkdirSync(runsDir, { recursive: true });
    entries = readdirSync(runsDir);
  } catch {
    entries = [];
  }

  const prefix = `${datePart}-`;
  let maxSeq = 0;

  for (const entry of entries) {
    if (entry.startsWith(prefix)) {
      const seqStr = entry.slice(prefix.length);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `${datePart}-${nextSeq}`;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}
