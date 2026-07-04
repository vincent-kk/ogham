import { walkLocalImages } from "../../../render/index.js";

// viewer.md is immutable for the lifetime of a session, so the parsed image
// source list can be cached per session id (insertion-order eviction).
const CACHE_CAP = 16;
const sourcesBySession = new Map<string, string[]>();

/** `file://` image sources of a session's viewer.md, in document order. */
export function getSessionImageSources(
  sessionId: string,
  markdown: string,
): string[] {
  const cached = sourcesBySession.get(sessionId);
  if (cached) return cached;
  const sources: string[] = [];
  walkLocalImages(markdown, (source) => sources.push(source));
  if (sourcesBySession.size >= CACHE_CAP) {
    const oldestSessionId = sourcesBySession.keys().next().value;
    if (oldestSessionId !== undefined) sourcesBySession.delete(oldestSessionId);
  }
  sourcesBySession.set(sessionId, sources);
  return sources;
}

/** Drop all cached entries (called when the http server closes). */
export function clearSessionImageSources(): void {
  sourcesBySession.clear();
}
