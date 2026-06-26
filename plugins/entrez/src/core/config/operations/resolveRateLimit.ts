import { RateLimit } from "../../../types/enums.js";
import type { EntrezCredentials } from "../../../types/config.js";
import {
  RATE_LIMIT_NO_KEY_PER_SEC,
  RATE_LIMIT_WITH_KEY_PER_SEC,
} from "../../../constants/defaults.js";

export interface ResolvedRateLimit {
  limit: RateLimit;
  perSec: number;
}

/**
 * Derive the effective NCBI rate limit from api_key presence: 10/s with a key,
 * 3/s without. The key value is never read here — only its presence.
 */
export function resolveRateLimit(
  credentials: EntrezCredentials,
): ResolvedRateLimit {
  return credentials.api_key
    ? { limit: RateLimit.WITH_KEY, perSec: RATE_LIMIT_WITH_KEY_PER_SEC }
    : { limit: RateLimit.NO_KEY, perSec: RATE_LIMIT_NO_KEY_PER_SEC };
}
