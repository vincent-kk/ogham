import {
  RETRY_BASE_DELAY_MS,
  RETRY_BACKOFF_MULTIPLIER,
  RETRY_MAX_DELAY_MS,
} from "../../../constants/defaults.js";

/**
 * Compute the backoff delay (ms) before a retry. A server-provided Retry-After
 * (429) wins, capped at the max delay; otherwise exponential backoff on the
 * attempt count, also capped.
 */
export function computeBackoffMs(
  attempt: number,
  retryAfterMs?: number,
): number {
  if (retryAfterMs !== undefined && retryAfterMs > 0)
    return Math.min(retryAfterMs, RETRY_MAX_DELAY_MS);

  const exponent = Math.max(0, attempt - 1);
  const delay =
    RETRY_BASE_DELAY_MS * Math.pow(RETRY_BACKOFF_MULTIPLIER, exponent);
  return Math.min(delay, RETRY_MAX_DELAY_MS);
}

/** Parse a Retry-After header (delta-seconds form) into milliseconds. */
export function parseRetryAfterMs(
  headerValue: string | null,
): number | undefined {
  if (!headerValue) return undefined;
  const seconds = Number.parseInt(headerValue, 10);
  if (Number.isNaN(seconds) || seconds <= 0) return undefined;
  return seconds * 1000;
}
