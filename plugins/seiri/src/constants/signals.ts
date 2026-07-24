/**
 * Consecutive failures of the same command before seiri says anything.
 *
 * Set where a deliberate red-then-green loop cannot reach it: the
 * implement discipline asks for a failing test first, so one or two
 * failures of the same command are the normal, correct shape of the work.
 * A third with nothing having gone green in between is the point where
 * "the fix is not landing" becomes more likely than "this red is on
 * purpose" — and even then the line only suggests.
 */
export const FAILURE_CHAIN_THRESHOLD = 3;

/**
 * Distinct commands tracked per session before the oldest is dropped.
 *
 * The counters are a bounded scratchpad, not a log. A long session runs
 * hundreds of commands and none of the old ones can still be part of a
 * consecutive chain.
 */
export const TRACKED_COMMANDS_CAP = 32;

/**
 * The one line the chain is allowed to inject.
 *
 * It concedes the fail-first case in its own text rather than trying to
 * tell the two apart, because nothing in a hook payload can: a test that
 * fails because it was written to is byte-identical to one that fails
 * because the fix is wrong.
 */
export const FAILURE_CHAIN_LINE = `The same command has failed ${FAILURE_CHAIN_THRESHOLD} times with nothing green in between — if this red is intended (fail-first), proceed; otherwise consider trace-cause before patching again.`;
