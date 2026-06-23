const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);

/** JSON-serialize a value safe for inlining inside an HTML <script> context. */
export function escapeJsonForHtml(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .split(LS)
    .join("\\u2028")
    .split(PS)
    .join("\\u2029");
}
