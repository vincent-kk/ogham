/** Existing abandonment declaration used as an insertion anchor. */
const ABANDON_LINE = /^ABANDON:/;

/**
 * Copy ledger lines and append one visible abandonment declaration.
 *
 * @param lines Exact parsed ledger lines.
 * @param id Gate identifier being abandoned.
 * @param reason Non-empty abandonment reason.
 * @returns New lines with the declaration after existing abandonments or at end.
 */
export function appendAbandonLine(
  lines: string[],
  id: string,
  reason: string,
): string[] {
  const updated = [...lines];
  let lastAbandon = -1;
  for (let index = 0; index < updated.length; index += 1)
    if (ABANDON_LINE.test(updated[index] ?? '')) lastAbandon = index;

  const declaration = `ABANDON: ${id} ${reason}`;
  if (lastAbandon >= 0) {
    updated.splice(lastAbandon + 1, 0, declaration);
    return updated;
  }

  const end = updated.at(-1) === '' ? updated.length - 1 : updated.length;
  updated.splice(end, 0, '', declaration);
  return updated;
}
