import type { ErrorCode } from "../../../types/enums.js";
import { ErrorCode as ErrorCodes } from "../../../types/enums.js";
import { Messages } from "../../../constants/messages.js";
import { computeBackoffMs } from "./backoff429.js";

/** Outcome of one HTTP attempt, classified for the retry loop. */
export type AttemptOutcome =
  | {
      kind: "success";
      status: number;
      text?: string;
      binary?: ArrayBuffer;
      contentType?: string;
    }
  | {
      kind: "retry";
      status: number;
      isRateLimit: boolean;
      retryAfterMs?: number;
      code: ErrorCode;
      message: string;
    }
  | { kind: "fatal"; status: number; code: ErrorCode; message: string };

export interface RetryPolicy {
  /** Max retries for transient 5xx/network errors. */
  maxRetries: number;
  /** Max retries for 429 rate limiting (separate budget). */
  rateRetryMax: number;
  sleep: (ms: number) => Promise<void>;
}

/**
 * Drive an HTTP attempt with separate retry budgets for transient errors and
 * 429 rate limiting. Exhausting the rate budget surfaces a dedicated message
 * (off-peak guidance). Returns the terminal success or fatal outcome.
 */
export async function withRetry(
  attempt: (attemptIndex: number) => Promise<AttemptOutcome>,
  policy: RetryPolicy,
): Promise<AttemptOutcome> {
  let normalRetries = 0;
  let rateRetries = 0;

  for (let i = 0; ; i += 1) {
    const outcome = await attempt(i);
    if (outcome.kind === "success" || outcome.kind === "fatal") return outcome;

    if (outcome.isRateLimit) {
      if (rateRetries >= policy.rateRetryMax)
        return {
          kind: "fatal",
          status: outcome.status,
          code: ErrorCodes.RATE_LIMITED,
          message: Messages.RATE_RETRY_EXCEEDED,
        };

      rateRetries += 1;
    } else {
      if (normalRetries >= policy.maxRetries)
        return {
          kind: "fatal",
          status: outcome.status,
          code: outcome.code,
          message: outcome.message,
        };

      normalRetries += 1;
    }

    await policy.sleep(
      computeBackoffMs(normalRetries + rateRetries, outcome.retryAfterMs),
    );
  }
}
