import { createHash } from 'node:crypto';

/** Runs of formatting whitespace that do not distinguish command identity. */
const WHITESPACE_RUN = /\s+/g;

/** Number of digest characters retained for equality within local state. */
const HASH_LENGTH = 16;

/**
 * Identify a command by shape rather than by text.
 *
 * Whitespace is normalised first so equivalent invocations share an
 * identity even when their line breaks differ.
 *
 * Truncated because this only ever feeds an equality check between
 * commands in local state; it is not a content address and nothing verifies
 * anything with it.
 *
 * @param command Command text whose whitespace-insensitive identity is needed.
 * @returns Truncated SHA-256 digest of the normalized command.
 */
export function hashCommand(command: string): string {
  const normalised = command.replace(WHITESPACE_RUN, ' ').trim();
  return createHash('sha256')
    .update(normalised)
    .digest('hex')
    .slice(0, HASH_LENGTH);
}
