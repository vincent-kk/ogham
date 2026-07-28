import { findResultEvent } from './findResultEvent.js';
import { parseResult } from './parseResult.js';

// The reason a claude run failed rides its stream-json result event, not stderr: a
// usage-limit run exits non-zero with an empty stderr. Null unless the stream really
// carried that event, so a spawn-level failure keeps reporting stderr instead of this
// module's "produced no output" wording, which is a symptom, not a reason.
export function cliFailureMessage(stdout: string): string | null {
  if (findResultEvent(stdout) === null) return null;
  return parseResult(stdout).error;
}
