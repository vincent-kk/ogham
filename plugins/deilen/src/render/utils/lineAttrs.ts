import type Token from "markdown-it/lib/token.mjs";

/** Render ` data-source-line="…" data-source-end="…"` for a mapped token. */
export function lineAttrs(token: Token): string {
  const map = token.map;
  if (!map) return "";
  return ` data-source-line="${map[0] + 1}" data-source-end="${map[1]}"`;
}
