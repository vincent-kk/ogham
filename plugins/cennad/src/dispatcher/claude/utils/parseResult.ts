export interface ParsedClaudeResult {
  response: string | null;
  error: string | null;
}

// claude --output-format json emits a single result object:
// { type:'result', subtype, is_error, result:'<text>', session_id, ... }.
// Extract `result` as the response; flag an error when the envelope marks one or
// carries no text.
export function parseResult(stdout: string): ParsedClaudeResult {
  const trimmed = stdout.trim();
  if (trimmed.length === 0)
    return { response: null, error: 'claude produced no output' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { response: null, error: 'claude output was not valid JSON' };
  }
  if (typeof parsed !== 'object' || parsed === null)
    return { response: null, error: 'claude output was not a JSON object' };
  const obj = parsed as Record<string, unknown>;
  const response = typeof obj.result === 'string' ? obj.result : null;
  const isError =
    obj.is_error === true ||
    (typeof obj.subtype === 'string' && obj.subtype !== 'success');
  if (isError)
    return {
      response,
      error: response ?? `claude reported ${String(obj.subtype ?? 'an error')}`,
    };
  if (response === null)
    return { response: null, error: 'claude returned an empty result' };
  return { response, error: null };
}
