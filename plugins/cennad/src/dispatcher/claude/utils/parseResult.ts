import { findResultEvent } from './findResultEvent.js';

export interface ParsedClaudeResult {
  response: string | null;
  error: string | null;
}

// The result event mirrors the old single-object json envelope:
// { type:'result', subtype, is_error, result:'<text>', session_id, ... }.
// Extract `result` as the response; flag an error when the envelope marks one or
// carries no text.
export function parseResult(stdout: string): ParsedClaudeResult {
  if (stdout.trim().length === 0)
    return { response: null, error: 'claude produced no output' };
  const event = findResultEvent(stdout);
  if (event === null)
    return {
      response: null,
      error: 'claude stream ended without a result event',
    };
  const response = typeof event.result === 'string' ? event.result : null;
  const isError =
    event.is_error === true ||
    (typeof event.subtype === 'string' && event.subtype !== 'success');
  if (isError)
    return {
      response,
      error:
        response ?? `claude reported ${String(event.subtype ?? 'an error')}`,
    };
  if (response === null)
    return { response: null, error: 'claude returned an empty result' };
  return { response, error: null };
}
