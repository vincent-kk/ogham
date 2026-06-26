// U+2028 / U+2029 are valid in JSON strings but are JS line terminators, so they
// must be escaped before inlining JSON inside a <script>. Built via char code to
// avoid placing raw line separators in this source file.
const LINE_SEP = new RegExp(String.fromCharCode(0x2028), "g");
const PARA_SEP = new RegExp(String.fromCharCode(0x2029), "g");

/**
 * Serialize a value to JSON safe for inlining inside a <script> tag — escapes
 * the characters that could break out of the element (`<`, `>`, `&`) and the
 * JS line separators.
 */
export function escapeJsonForHtml(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(LINE_SEP, "\\u2028")
    .replace(PARA_SEP, "\\u2029");
}
