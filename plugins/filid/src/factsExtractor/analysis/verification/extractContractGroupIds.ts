const CONTRACT_MARKER = /\bfilid:contract\s+([A-Za-z][A-Za-z0-9._-]*)/g;

function extractComments(source: string): string[] {
  const comments: string[] = [];
  let cursor = 0;
  while (cursor < source.length) {
    const character = source[cursor];
    const next = source[cursor + 1] ?? '';
    if (character === "'" || character === '"' || character === '`') {
      const quote = character;
      cursor += 1;
      while (cursor < source.length) {
        if (source[cursor] === '\\') {
          cursor += 2;
          continue;
        }
        if (source[cursor] === quote) {
          cursor += 1;
          break;
        }
        cursor += 1;
      }
      continue;
    }
    if (character === '/' && next === '/') {
      const start = cursor + 2;
      cursor = start;
      while (cursor < source.length && source[cursor] !== '\n') cursor += 1;
      comments.push(source.slice(start, cursor));
      continue;
    }
    if (character === '/' && next === '*') {
      const start = cursor + 2;
      cursor = start;
      while (
        cursor < source.length &&
        !(source[cursor] === '*' && source[cursor + 1] === '/')
      )
        cursor += 1;
      comments.push(source.slice(start, cursor));
      cursor = Math.min(source.length, cursor + 2);
      continue;
    }
    cursor += 1;
  }
  return comments;
}

export function extractContractGroupIds(source: string): string[] {
  const ids = new Set<string>();
  for (const comment of extractComments(source)) {
    CONTRACT_MARKER.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = CONTRACT_MARKER.exec(comment)) !== null) ids.add(match[1]);
  }
  return [...ids];
}
