import type { WorkflowSkill } from '../constants/signals.js';

/**
 * The seiri workflow this session loaded most recently.
 *
 * Where the session is, as opposed to where an injected posture says it
 * should be — the one fact about the chain that has to be observed rather
 * than asserted.
 */
export interface WorkflowSignal {
  /** Bare skill name (`write-plan`); the namespace is added when rendered. */
  skill: WorkflowSkill;
  /** True once a turn has been told. Nothing is said twice. */
  announced: boolean;
}

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
  /** Last workflow loaded, absent until one is. */
  workflow?: WorkflowSignal;
}
