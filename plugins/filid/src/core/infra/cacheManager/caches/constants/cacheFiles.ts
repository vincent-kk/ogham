/**
 * Cache filename convention — the single source of truth for the on-disk names
 * written under a session's cache directory. pruneOldSessions and
 * removeSessionFiles sweep the session-scoped set together, so both derive
 * their paths from these prefixes; a literal drift between the two would leak
 * files across a compact/clear epoch reset.
 */

/** Session-scoped filename prefixes, each completed by a sessionIdHash. */
export const CACHE_PREFIX = {
  SESSION_CONTEXT: 'session-context-',
  PROMPT_CONTEXT: 'prompt-context-',
  GUIDE: 'guide-',
  BOUNDARY: 'boundary-',
  FMAP: 'fmap-',
  DELIVERED: 'delivered-',
  TURN: 'turn-',
} as const;

/** Skill-run hash cache prefix — keyed by skill name, not by session. */
export const RUN_HASH_PREFIX = 'run-';

/** Fixed, non-hashed cache filename (spike-mode gate audit trail). */
export const MODE_AUDIT_FILE = 'mode-audit.jsonl';

/** Fractal-map lock directory suffix (mkdir mutex beside the map file). */
export const LOCK_SUFFIX = '.lock';

/** Ownership-token filename inside a lock directory. */
export const LOCK_OWNER_FILE = 'owner';

/** Atomic-write temp-file suffix (pid-scoped, swapped in via rename). */
export const TMP_SUFFIX = '.tmp';

/** Subagent-scope infix in a fractal-map filename: fmap-{hash}-sub-{subHash}. */
export const SUBSCOPE_INFIX = '-sub-';
