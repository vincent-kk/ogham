import { isRecord } from '../../../utils/isRecord.js';

// stream-json emits one JSON object per line: step_update events (the liveness signal
// the idle timeout watches) then a final { event: 'result', result: { status,
// response } }. A non-SUCCESS status yields null so the caller can report the streamed
// error, or recover from the transcript when the stream said nothing at all.
export function findAgyResult(stdout: string): string | null {
  let response: string | null = null;
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
    const { status, response: text } = parsed.result;
    response =
      status === 'SUCCESS' && typeof text === 'string' && text.trim().length > 0
        ? text.trim()
        : null;
  }
  return response;
}
