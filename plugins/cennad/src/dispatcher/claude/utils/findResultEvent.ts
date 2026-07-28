import { isRecord } from '../../../utils/isRecord.js';

// stream-json emits one JSON object per line: progress events (the liveness signal
// the idle timeout watches) followed by a single `type: 'result'` event carrying the
// answer. Take the last one — a line that does not parse is skipped, not fatal.
export function findResultEvent(
  stdout: string,
): Record<string, unknown> | null {
  let found: Record<string, unknown> | null = null;
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (isRecord(parsed) && parsed.type === 'result') found = parsed;
  }
  return found;
}
