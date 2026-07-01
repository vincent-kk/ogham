import { normalizeEol } from '@ogham/cross-platform';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// agy -p emits plain text. If it parses as a JSON object, probe common answer
// keys; otherwise return the trimmed text. Empty stdout → null (Issue #76).
export function parseJsonOutput(stdout: string): string | null {
  const text = normalizeEol(stdout).trim();
  if (text.length === 0) return null;
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
