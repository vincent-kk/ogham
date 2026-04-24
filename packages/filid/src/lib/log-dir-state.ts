/**
 * Shared mutable log-dir reference. Exposed as a single-slot object so
 * sibling per-function files (set-log-dir, get-log-dir, reset-logger,
 * write-to-file) can mutate and read the same state without each file
 * re-declaring its own module-level `let`. ES modules forbid writing to
 * named imports, hence the wrapper.
 */
export const logDirState: { value: string | undefined } = { value: undefined };
