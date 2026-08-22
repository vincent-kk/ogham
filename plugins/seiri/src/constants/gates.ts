/** Valid task directory names: lowercase kebab-case without empty segments. */
export const TASK_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Gate identifiers accepted by the ledger grammar. */
export const GATE_ID_PATTERN = /^G\d+$/;

/** Evidence marker for a gate with no recorded proof. */
export const EVIDENCE_PENDING = 'pending';

/** Evidence marker left when a formerly met gate fails again. */
export const EVIDENCE_REGRESSED = 'pending (regressed)';

/** Maximum characters kept in one final evidence value. */
export const EVIDENCE_MAX_CHARS = 200;

/** Agent identifier characters retained in evidence and verdict lines. */
export const AGENT_MARKER_CHARS = 8;
