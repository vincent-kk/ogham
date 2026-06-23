import type Token from "markdown-it/lib/token.mjs";

export interface SourceLineRange {
  startLine: number;
  endLine: number;
}

/** Collect 1-based source-line ranges of all anchorable block tokens. */
export function collectSourceLines(tokens: Token[]): SourceLineRange[] {
  const out: SourceLineRange[] = [];
  for (const token of tokens) {
    if (token.nesting === -1) continue;
    const map = token.map;
    if (!map) continue;
    out.push({ startLine: map[0] + 1, endLine: map[1] });
  }
  return out;
}
