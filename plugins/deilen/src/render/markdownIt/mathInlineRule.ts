import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";

import { scanOpenDelimiter } from "./scanOpenDelimiter.js";
import { scanContent } from "./scanContent.js";
import { emitPendingText } from "./emitPendingText.js";

/**
 * Inline `$…$` rule. Emits a `math_inline` token holding the raw TeX; the actual
 * typesetting happens client-side (KaTeX). Mirrors markdown-it-katex's
 * delimiter validation so currency like `$5 and $6` is not treated as math.
 */
export function mathInline(state: StateInline, silent: boolean): boolean {
  const open = scanOpenDelimiter(state);
  if (open === "not-dollar") return false;
  if (open === "invalid-open") {
    return emitPendingText(state, silent, "$", state.pos + 1);
  }

  const start = state.pos + 1;
  const content = scanContent(state, start);
  if (content.kind === "none") {
    return emitPendingText(state, silent, "$", start);
  }
  if (content.kind === "empty") {
    return emitPendingText(state, silent, "$$", start + 1);
  }

  if (!silent) {
    const token = state.push("math_inline", "math", 0);
    token.markup = "$";
    token.content = state.src.slice(start, content.index);
  }
  state.pos = content.index + 1;
  return true;
}
