type PathSegment = string | number;

export function getAt(
  root: unknown,
  path: ReadonlyArray<PathSegment>,
): unknown {
  let cur: unknown = root;
  for (const seg of path) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof seg === 'number') {
      if (!Array.isArray(cur)) return undefined;
      cur = cur[seg];
    } else {
      if (typeof cur !== 'object' || cur === null) return undefined;
      cur = (cur as Record<string, unknown>)[seg];
    }
  }
  return cur;
}
