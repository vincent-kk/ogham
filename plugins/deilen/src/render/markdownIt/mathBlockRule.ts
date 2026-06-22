import type StateBlock from "markdown-it/lib/rules_block/state_block.mjs";

/**
 * Block `$$ … $$` rule. Emits a `math_block` token holding the raw multi-line
 * TeX; typesetting is client-side (KaTeX). Ported from markdown-it-katex.
 */
export function mathBlock(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean {
  let pos = state.bMarks[startLine] + state.tShift[startLine];
  let max = state.eMarks[startLine];
  if (pos + 2 > max) return false;
  if (state.src.slice(pos, pos + 2) !== "$$") return false;
  pos += 2;
  let firstLine = state.src.slice(pos, max);
  if (silent) return true;

  let found = false;
  let lastLine = "";
  if (firstLine.trim().slice(-2) === "$$") {
    firstLine = firstLine.trim().slice(0, -2);
    found = true;
  }

  let next = startLine;
  while (!found) {
    next += 1;
    if (next >= endLine) break;
    pos = state.bMarks[next] + state.tShift[next];
    max = state.eMarks[next];
    if (pos < max && state.tShift[next] < state.blkIndent) break;
    if (state.src.slice(pos, max).trim().slice(-2) === "$$") {
      const lastPos = state.src.slice(0, max).lastIndexOf("$$");
      lastLine = state.src.slice(pos, lastPos);
      found = true;
    }
  }

  state.line = next + 1;
  const token = state.push("math_block", "math", 0);
  token.block = true;
  token.content =
    (firstLine.trim() ? `${firstLine}\n` : "") +
    state.getLines(startLine + 1, next, state.tShift[startLine], true) +
    (lastLine.trim() ? lastLine : "");
  token.map = [startLine, state.line];
  token.markup = "$$";
  return true;
}
