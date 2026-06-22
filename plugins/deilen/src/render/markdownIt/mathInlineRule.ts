import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";

const DOLLAR = 0x24;
const BACKSLASH = 0x5c;

function isValidInlineDelim(
  state: StateInline,
  pos: number,
): { canOpen: boolean; canClose: boolean } {
  const max = state.posMax;
  const prevChar = pos > 0 ? state.src.charCodeAt(pos - 1) : -1;
  const nextChar = pos + 1 <= max ? state.src.charCodeAt(pos + 1) : -1;
  const nextIsSpace = nextChar === 0x20 || nextChar === 0x09;
  const prevIsSpace = prevChar === 0x20 || prevChar === 0x09;
  const nextIsDigit = nextChar >= 0x30 && nextChar <= 0x39;
  return {
    canOpen: !nextIsSpace,
    canClose: !prevIsSpace && !nextIsDigit,
  };
}

/**
 * Inline `$…$` rule. Emits a `math_inline` token holding the raw TeX; the actual
 * typesetting happens client-side (KaTeX). Mirrors markdown-it-katex's
 * delimiter validation so currency like `$5 and $6` is not treated as math.
 */
export function mathInline(state: StateInline, silent: boolean): boolean {
  if (state.src.charCodeAt(state.pos) !== DOLLAR) return false;
  if (!isValidInlineDelim(state, state.pos).canOpen) {
    if (!silent) state.pending += "$";
    state.pos += 1;
    return true;
  }
  const start = state.pos + 1;
  let match = start;
  let found = -1;
  while ((found = state.src.indexOf("$", match)) !== -1) {
    let pos = found - 1;
    while (state.src.charCodeAt(pos) === BACKSLASH) pos -= 1;
    if ((found - pos) % 2 === 1) break;
    match = found + 1;
  }
  if (found === -1) {
    if (!silent) state.pending += "$";
    state.pos = start;
    return true;
  }
  if (found - start === 0) {
    if (!silent) state.pending += "$$";
    state.pos = start + 1;
    return true;
  }
  if (!isValidInlineDelim(state, found).canClose) {
    if (!silent) state.pending += "$";
    state.pos = start;
    return true;
  }
  if (!silent) {
    const token = state.push("math_inline", "math", 0);
    token.markup = "$";
    token.content = state.src.slice(start, found);
  }
  state.pos = found + 1;
  return true;
}
