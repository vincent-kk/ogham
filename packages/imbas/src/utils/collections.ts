/**
 * @file utils/collections.ts
 * @description Collection utility functions
 */

/** Find duplicate values in an array. Returns array of duplicated values. */
export function findDuplicates(arr: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const item of arr) {
    if (seen.has(item)) dupes.add(item);
    else seen.add(item);
  }
  return Array.from(dupes);
}
