// Public contract of @ogham/session-finalizer. Consumers import from the package root;
// there are no subpath addresses. Every symbol below is re-exported by name
// from the file that owns it — a wildcard would let an internal rename widen
// this contract silently.

export { registerShutdownFinalizer } from "./operations/registerShutdownFinalizer.js";
export type { ShutdownFinalizerOptions } from "./operations/registerShutdownFinalizer.js";
export { runFinalizer } from "./operations/runFinalizer.js";
