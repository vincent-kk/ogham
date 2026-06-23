import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";

/** Treat the scanned span as plain text: keep the literal `$`(s) and advance. */
export function emitPendingText(
  state: StateInline,
  silent: boolean,
  text: string,
  nextPos: number,
): true {
  if (!silent) state.pending += text;
  state.pos = nextPos;
  return true;
}
