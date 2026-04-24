export function parseFrontmatter(
  content: string,
): Record<string, string | number | null> {
  const match = /^---\n([\s\S]*?)\n---/.exec(content);
  if (!match) return {};
  const result: Record<string, string | number | null> = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    if (value === 'null') {
      result[key] = null;
    } else if (/^\d+(\.\d+)?$/.test(value)) {
      result[key] = Number(value);
    } else if (value.startsWith('"') && value.endsWith('"')) {
      result[key] = value.slice(1, -1).replace(/\\"/g, '"');
    } else {
      result[key] = value;
    }
  }
  return result;
}
