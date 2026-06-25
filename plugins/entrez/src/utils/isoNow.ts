/**
 * ISO-8601 timestamp from an injectable clock. Pass `nowMs` for deterministic
 * output (SearchManifest reproducibility / tests); defaults to the wall clock.
 */
export function isoNow(nowMs: number = Date.now()): string {
  return new Date(nowMs).toISOString();
}
