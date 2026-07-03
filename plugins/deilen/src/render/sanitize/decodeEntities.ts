const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  colon: ":",
  semi: ";",
  sol: "/",
  num: "#",
  equals: "=",
  tab: "\t",
  newline: "\n",
  nbsp: "\u00a0",
};

// Numeric refs decode with or without the trailing semicolon (as browsers do);
// named refs require it. Unknown named refs stay literal.
const ENTITY_RE =
  /&(?:#[xX]([0-9a-fA-F]{1,6});?|#([0-9]{1,7});?|([a-zA-Z][a-zA-Z0-9]*);)/g;

function fromCodePointSafe(codePoint: number): string {
  if (
    codePoint === 0 ||
    codePoint > 0x10ffff ||
    (codePoint >= 0xd800 && codePoint <= 0xdfff)
  )
    return "�";
  return String.fromCodePoint(codePoint);
}

/**
 * Decode HTML character references in an attribute value so URL/style safety
 * checks see what the browser would see (`java&#115;cript:` → `javascript:`).
 * Covers all numeric refs plus the named refs relevant to scheme smuggling.
 */
export function decodeEntities(value: string): string {
  return value.replace(ENTITY_RE, (match, hex, dec, name) => {
    if (hex !== undefined) return fromCodePointSafe(parseInt(hex, 16));
    if (dec !== undefined) return fromCodePointSafe(parseInt(dec, 10));
    return NAMED[(name as string).toLowerCase()] ?? match;
  });
}
