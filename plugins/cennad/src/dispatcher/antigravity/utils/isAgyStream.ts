import { isRecord } from '../../../utils/isRecord.js';

// True when stdout is agy's stream-json: any line is a JSON object carrying an
// `event` key. Recognising the shape lets a caller stop after the stream yields no
// answer, instead of falling through to the plain-text path — which would parse-fail
// on multi-line JSONL and hand back the whole stream as if it were the response.
// Every line is examined because agy prints notices (a version banner) around the
// stream, and judging by the first line alone would let one of them disable this.
export function isAgyStream(stdout: string): boolean {
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (isRecord(parsed) && typeof parsed.event === 'string') return true;
  }
  return false;
}
