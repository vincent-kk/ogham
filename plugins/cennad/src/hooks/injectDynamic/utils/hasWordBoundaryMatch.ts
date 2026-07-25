// ASCII [0-9A-Za-z_] — the \w class spelled out, so no regex is built from
// user-authored keywords.
function isWordCode(code: number): boolean {
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 95
  );
}

// True when `term` occurs in `text` with a non-word character (or a string edge)
// on both sides, so "code" fires on "fix the code" and "(code)" but not on
// "decode". Both arguments are expected to be lowercased already.
export function hasWordBoundaryMatch(text: string, term: string): boolean {
  const lastStart = text.length - term.length;
  let from = 0;

  while (from <= lastStart) {
    const at = text.indexOf(term, from);
    if (at === -1) return false;

    const end = at + term.length;
    const leftClear = at === 0 || !isWordCode(text.charCodeAt(at - 1));
    const rightClear = end === text.length || !isWordCode(text.charCodeAt(end));
    if (leftClear && rightClear) return true;

    // Advance one unit so an overlapping later occurrence stays reachable.
    from = at + 1;
  }
  return false;
}
