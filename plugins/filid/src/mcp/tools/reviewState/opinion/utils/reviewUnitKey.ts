/**
 * Build the stable multiset key for one assigned or reported review unit.
 *
 * @param path Project-relative file path.
 * @param change Git change class.
 * @param chunk One-based chunk identity or null.
 * @returns Collision-safe serialized unit identity.
 */
export function reviewUnitKey(
  path: string,
  change: string,
  chunk: string | null,
): string {
  return JSON.stringify([path, change, chunk]);
}
