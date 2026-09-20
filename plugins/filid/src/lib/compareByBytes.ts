/**
 * Order two strings by their raw UTF-8 bytes.
 *
 * The comparison a digest input needs: `localeCompare` consults ICU, whose
 * collation differs between machines and Node builds, so a list sorted with it
 * can hash differently on two computers holding identical bytes. This one
 * depends on nothing outside the strings.
 * @param left - One string.
 * @param right - The other.
 * @returns Negative, zero or positive, as a comparator.
 */
export function compareByBytes(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}
