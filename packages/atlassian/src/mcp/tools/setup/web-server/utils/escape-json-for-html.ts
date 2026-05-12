// U+2028 (LINE SEPARATOR) and U+2029 (PARAGRAPH SEPARATOR) are line terminators
// inside JS source, so placing them in a regex literal makes some parsers
// (vite/oxc) treat the regex as unterminated. Build the match characters via
// fromCharCode and use split/join to sidestep the literal entirely.
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);

/** Escape a value for embedding inside an HTML <script> block. JSON.stringify
 *  alone is insufficient — `</script>` (or U+2028 / U+2029) inside fields the
 *  setup user typed (username, base_url) could otherwise break out of the
 *  script tag or corrupt JS parsing. */
export function escapeJsonForHtml(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .split(LS).join('\\u2028')
    .split(PS).join('\\u2029');
}
