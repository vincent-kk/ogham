// Order-insensitive structural equality for JSON values (objects compared by key
// set, arrays positionally). Used to detect whether an on-disk config differs
// from its normalized/validated form before rewriting it.
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length)
      return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    const ak = Object.keys(ao);
    if (ak.length !== Object.keys(bo).length) return false;
    return ak.every(
      (k) =>
        Object.prototype.hasOwnProperty.call(bo, k) && deepEqual(ao[k], bo[k]),
    );
  }
  return false;
}
