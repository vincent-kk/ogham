/**
 * CLI flag that couples a detached finalizer spawn to its entry-point dispatch.
 * `registerShutdownFinalizer` spawns `node <entry> <flag> <ctx>`; `runFinalizer`
 * matches the same flag on the child's argv. Sharing one constant keeps both
 * sides aligned when neither overrides `flag`.
 */
export const DEFAULT_FINALIZE_FLAG = "--finalize";
