import { createHash } from 'node:crypto';

const WHITESPACE_RUN = /\s+/g;
const HASH_LENGTH = 16;

/**
 * Identify a command by shape rather than by text.
 *
 * Whitespace is normalised first so that a command retyped with a
 * different line break still counts as the same one — an agent rebuilding
 * the same invocation is exactly the chain worth noticing.
 *
 * Truncated because this only ever feeds an equality check between
 * commands in one session; it is not a content address and nothing
 * verifies anything with it.
 */
export function hashCommand(command: string): string {
  const normalised = command.replace(WHITESPACE_RUN, ' ').trim();
  return createHash('sha256')
    .update(normalised)
    .digest('hex')
    .slice(0, HASH_LENGTH);
}
