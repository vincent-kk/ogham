import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";

export function isValidInlineDelim(
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
