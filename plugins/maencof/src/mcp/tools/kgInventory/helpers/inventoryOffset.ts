/** Validate an opaque continuation against both disk identity and canonical filters. */
export function inventoryOffset(
  cursor: string | undefined,
  snapshot: string,
  filters: string,
): number {
  if (!cursor) return 0;
  let value;
  try {
    value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new Error('invalid_inventory_input');
  }
  if (
    !value ||
    !Number.isSafeInteger(value.offset) ||
    value.offset < 1 ||
    typeof value.snapshot !== 'string' ||
    typeof value.filters !== 'string'
  )
    throw new Error('invalid_inventory_input');
  if (value.snapshot !== snapshot || value.filters !== filters)
    throw new Error('inventory_changed');
  return value.offset as number;
}
