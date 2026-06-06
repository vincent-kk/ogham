function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// `agy models` output format is version-dependent (a JSON array, a JSON object
// with a `models` field, or a plain text table). Try JSON first, fall back to
// non-decorative lines. Returns the model full-names verbatim (deduped).
export function parseModels(stdout: string): string[] {
  const text = stdout.trim();
  if (text.length === 0) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !/^[-=*#|+]/.test(line));
    return Array.from(new Set(lines));
  }

  const arr: unknown[] | null = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.models)
      ? parsed.models
      : null;
  if (!arr) return [];

  const names = arr
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (isRecord(entry) && typeof entry.name === 'string') return entry.name;
      return '';
    })
    .filter((name) => name.trim().length > 0);

  return Array.from(new Set(names));
}
