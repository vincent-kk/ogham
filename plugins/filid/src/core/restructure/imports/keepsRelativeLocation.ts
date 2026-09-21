import {
  pathForCompare,
  portableDirname,
  portableRelative,
} from '@ogham/cross-platform';

/**
 * Whether the moves leave an imported file at the same place relative to its
 * consumer, so the consumer's specifier usually still resolves.
 * @param consumerBefore - Consumer file before the moves
 * @param resolvedBefore - Imported file before the moves
 * @param consumerAfter - Consumer file after every move
 * @param resolvedAfter - Imported file after every move
 * @returns True when the path from the consumer's directory to the imported
 * file is the same before and after
 */
export function keepsRelativeLocation(
  consumerBefore: string,
  resolvedBefore: string,
  consumerAfter: string,
  resolvedAfter: string,
): boolean {
  return (
    pathForCompare(
      portableRelative(portableDirname(consumerBefore), resolvedBefore),
    ) ===
    pathForCompare(
      portableRelative(portableDirname(consumerAfter), resolvedAfter),
    )
  );
}
