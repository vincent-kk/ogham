import { isRecord } from '../../../utils/isRecord.js';

// agy reports why a run failed inside its stream, not on stderr: an invalid model
// selection exits 1 with an empty stderr and `{event:"result", result:{status:
// "ERROR", error:"…"}}` on stdout. Without this the envelope degrades to
// `unknown` / "Unclassified failure."
export function findAgyError(stdout: string): string | null {
  let error: string | null = null;
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (!isRecord(parsed) || parsed.event !== 'result') continue;
    if (!isRecord(parsed.result)) continue;
    const { status, error: text } = parsed.result;
    if (status === 'SUCCESS') continue;
    if (typeof text === 'string' && text.trim().length > 0) error = text.trim();
  }
  return error;
}
