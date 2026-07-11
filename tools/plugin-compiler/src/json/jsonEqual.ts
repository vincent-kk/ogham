import { isDeepStrictEqual } from "node:util";

/**
 * Whether two JSON texts are semantically equal (ignoring whitespace, key
 * order, and array-wrapping style). Used by the equivalence gate so a
 * hand-inlined `.mcp.json` and a `JSON.stringify`-emitted one compare equal —
 * formatting is not a behavioral regression for machine-read manifests.
 * Returns false if either side fails to parse.
 */
export function jsonEqual(a: string, b: string): boolean {
  try {
    return isDeepStrictEqual(JSON.parse(a), JSON.parse(b));
  } catch {
    return false;
  }
}
