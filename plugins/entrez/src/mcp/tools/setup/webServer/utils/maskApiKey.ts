/** Sentinel shown in place of a stored api_key (never the real value). */
export const API_KEY_MASK = "••••••••••";

/** Mask a present api_key for display; undefined when none is stored. */
export function maskApiKey(apiKey?: string): string | undefined {
  return apiKey ? API_KEY_MASK : undefined;
}

/**
 * Resolve a submitted api_key against the stored one: the mask means
 * "unchanged" (keep existing); empty means "cleared"; anything else is new.
 */
export function restoreApiKey(submitted: string | undefined, existing?: string): string | undefined {
  if (submitted === API_KEY_MASK) return existing;
  if (submitted === undefined || submitted === "") return undefined;
  return submitted;
}
