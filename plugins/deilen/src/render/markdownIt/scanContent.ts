import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";

import { BACKSLASH } from "./mathDelimiters.js";
import { isValidInlineDelim } from "./isValidInlineDelim.js";

export type ContentScan =
  | { kind: "none" }
  | { kind: "empty" }
  | { kind: "found"; index: number };

/**
 * From `start`, resolve the inline math body: scan for the next unescaped `$`
 * (a `$` preceded by an odd backslash run is escaped and skipped), then classify
 * the result — `none` when no valid closer exists (missing or fails close
 * validation), `empty` for an immediate `$$`, otherwise `found` with the index.
 */
export function scanContent(state: StateInline, start: number): ContentScan {
  let match = start;
  let found: number;
  while ((found = state.src.indexOf("$", match)) !== -1) {
    let pos = found - 1;
    while (state.src.charCodeAt(pos) === BACKSLASH) pos -= 1;
    if ((found - pos) % 2 === 1) break;
    match = found + 1;
  }
  if (found === -1) return { kind: "none" };
  if (found - start === 0) return { kind: "empty" };
  if (!isValidInlineDelim(state, found).canClose) return { kind: "none" };
  return { kind: "found", index: found };
}
