// Process-local mirror of on-disk `meta.status` for sessions this process
// created: registered by createSession, released by closeSession, removeSession
// and pruneExpired. The HTTP listener reads it to stay up while a viewer can
// still submit.
const serving = new Set<string>();

/** Record a session this process created as serving. */
export function registerServing(sessionId: string): void {
  serving.add(sessionId);
}

/** Release a session once it is closed, removed, or pruned. */
export function unregisterServing(sessionId: string): void {
  serving.delete(sessionId);
}

/** True while any session created by this process is still serving. */
export function hasServingSessions(): boolean {
  return serving.size > 0;
}
