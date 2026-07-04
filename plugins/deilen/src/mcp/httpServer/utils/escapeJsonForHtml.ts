const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

const ESCAPE_BY_CHARACTERS = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  [LINE_SEPARATOR]: "\\u2028",
  [PARAGRAPH_SEPARATOR]: "\\u2029",
} as const;
// Derived from the map keys so the class and the lookup cannot drift apart.
// Keys must stay free of character-class metacharacters (]-^\).
const UNSAFE_IN_SCRIPT_PATTERN = new RegExp(
  `[${Object.keys(ESCAPE_BY_CHARACTERS).join("")}]`,
  "g",
);

/** JSON-serialize a value safe for inlining inside an HTML <script> context. */
export function escapeJsonForHtml(value: unknown): string {
  return JSON.stringify(value).replace(
    UNSAFE_IN_SCRIPT_PATTERN,
    (character) => ESCAPE_BY_CHARACTERS[character],
  );
}
