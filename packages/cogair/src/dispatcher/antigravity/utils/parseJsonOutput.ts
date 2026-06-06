import { normalizeEol } from '@ogham/cross-platform';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// agy -p --output-format json emits a single JSON object with the answer plus
// usage stats. The exact answer key is version-dependent, so probe common
// candidates. Returns null for empty stdout (Issue #76) so callAgy can fall
// back; returns trimmed text verbatim if stdout was plain (non-JSON) text.
export function parseJsonOutput(stdout: string): string | null {
  const text = normalizeEol(stdout).trim();
  if (text.length === 0) return null;
  try {
    const json: unknown = JSON.parse(text);
    if (typeof json === 'string') {
      return json.trim().length > 0 ? json.trim() : null;
    }
    if (isRecord(json)) {
      for (const key of ['response', 'output', 'text', 'message', 'result']) {
        const value = json[key];
        if (typeof value === 'string' && value.trim().length > 0) {
          return value.trim();
        }
      }
      return null;
    }
    return null;
  } catch {
    return text;
  }
}
