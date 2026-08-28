import { NUMERIC_ID_PATTERN } from "./patterns.js";

/**
 * Normalize a Jira numeric identifier without losing string precision.
 * @param value Untrusted wire value that may represent an identifier.
 * @returns An unsigned decimal string, or `null` when the value is invalid or an unsafe number.
 */
export function parseNumericId(value: unknown): string | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0)
    return String(value);
  if (typeof value === "string" && NUMERIC_ID_PATTERN.test(value)) return value;
  return null;
}

/**
 * Compare two normalized Jira numeric identifiers exactly.
 * @param left First unsigned decimal identifier.
 * @param right Second unsigned decimal identifier.
 * @returns Whether both identifiers denote the same integer.
 */
export function numericIdsEqual(left: string, right: string): boolean {
  const normalizedLeft = parseNumericId(left);
  const normalizedRight = parseNumericId(right);
  return (
    normalizedLeft !== null &&
    normalizedRight !== null &&
    BigInt(normalizedLeft) === BigInt(normalizedRight)
  );
}
