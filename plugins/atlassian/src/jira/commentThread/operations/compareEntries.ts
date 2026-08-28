import { NUMERIC_ID_PATTERN } from "./patterns.js";

/** Compare thread entries by created time and then stable numeric or lexical id. */
export function compareEntries(
  left: { created: string; id: string },
  right: { created: string; id: string },
): number {
  const createdOrder = Date.parse(left.created) - Date.parse(right.created);
  if (createdOrder !== 0) return createdOrder;
  if (NUMERIC_ID_PATTERN.test(left.id) && NUMERIC_ID_PATTERN.test(right.id)) {
    const leftId = BigInt(left.id);
    const rightId = BigInt(right.id);
    if (leftId < rightId) return -1;
    if (leftId > rightId) return 1;
    return 0;
  }
  return left.id.localeCompare(right.id);
}
