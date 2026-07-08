export const EXEC_TIMEOUT_MS = 2000;

export const GIT_EXEC_TIMEOUT_MS = 1500;

/** Backoff delays between retries when git fails on a held index.lock. */
export const GIT_LOCK_RETRY_DELAYS_MS: readonly number[] = [250, 750];

export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const MAX_PINNED_NODES = 20;

export const L1_EXCERPT_MAX_CHARS = 512;

/**
 * Per-document cap (code points) for the L1 `gist` injected every turn.
 * Full L1 bodies are injected once at SessionStart; the turn context carries
 * only this bounded gist, so per-turn cost stays flat regardless of body size.
 */
export const L1_GIST_MAX_CHARS = 128;
