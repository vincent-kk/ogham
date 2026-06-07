function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const ANSI_PATTERN = new RegExp(
  `${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`,
  'g',
);

export function parseModels(stdout: string): string[] {
  const text = stdout.replace(ANSI_PATTERN, '').trim();
  if (text.length === 0) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return parsePlainText(text);
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

function parsePlainText(text: string): string[] {
  const names: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.length === 0) continue;
    if (line.includes('|')) {
      for (const cell of line.split('|')) {
        const value = cell.trim();
        if (value.length > 0 && !/^[-=+]+$/.test(value)) names.push(value);
      }
      continue;
    }
    if (/^[-=*#+]/.test(line)) continue;
    names.push(line);
  }
  return Array.from(new Set(names));
}
