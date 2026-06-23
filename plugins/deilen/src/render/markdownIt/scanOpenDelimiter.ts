import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";

import { DOLLAR } from "./mathDelimiters.js";
import { isValidInlineDelim } from "./isValidInlineDelim.js";

export type OpenScan = "not-dollar" | "invalid-open" | "open";

export function scanOpenDelimiter(state: StateInline): OpenScan {
  if (state.src.charCodeAt(state.pos) !== DOLLAR) return "not-dollar";
  if (!isValidInlineDelim(state, state.pos).canOpen) return "invalid-open";
  return "open";
}
