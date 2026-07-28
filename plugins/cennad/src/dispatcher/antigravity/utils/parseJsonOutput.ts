import { normalizeEol } from '@ogham/cross-platform';

import { isRecord } from '../../../utils/isRecord.js';

import { findAgyResult } from './findAgyResult.js';
import { isAgyStream } from './isAgyStream.js';

// agy runs with --output-format stream-json, so the answer normally arrives in a
// result event. Older builds emit plain text or a single JSON object — if the stream
// shape is absent, probe common answer keys, else return the trimmed text. Empty
// stdout → null (Issue #76 recovery takes over).
export function parseJsonOutput(stdout: string): string | null {
  const text = normalizeEol(stdout).trim();
  if (text.length === 0) return null;
  const streamed = findAgyResult(text);
  if (streamed !== null) return streamed;
  // A stream we recognised but read no answer from is a failure, not an invitation
  // to reinterpret the raw JSONL: the legacy paths below would fail to parse the
  // multi-line text and return the whole stream as the response, which also skips
  // the transcript recovery callAgy runs on null.
  if (isAgyStream(text)) return null;
  try {
    const json: unknown = JSON.parse(text);
    if (typeof json === 'string')
      return json.trim().length > 0 ? json.trim() : null;

    if (isRecord(json)) {
      for (const key of ['response', 'output', 'text', 'message', 'result']) {
        const value = json[key];
        if (typeof value === 'string' && value.trim().length > 0)
          return value.trim();
      }
      return null;
    }
    return null;
  } catch {
    return text;
  }
}
