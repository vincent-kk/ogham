/**
 * Contents of `<repoRoot>/.seiri/session-signals.json`.
 *
 * Scratch state for one session, never committed. Commands are stored as
 * hashes rather than text: the file only ever needs to answer "is this
 * the same command as last time", and a plaintext record of everything a
 * session ran is a liability nobody asked for.
 */
export interface SessionSignals {
  /** Owning session. A file from any other session is stale and replaced. */
  sessionId: string;
  /** Command hash → consecutive failures with nothing green in between. */
  counts: Record<string, number>;
  /** Command hashes already mentioned once. Nothing is said twice. */
  announced: string[];
}
