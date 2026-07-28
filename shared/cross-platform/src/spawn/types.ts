export interface SpawnOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  /**
   * No-output limit: the timer restarts on every stdout/stderr chunk, so a child
   * that keeps emitting survives past it. Independent of `timeoutMs` (a
   * wall-clock ceiling) — whichever fires first kills the child.
   */
  idleTimeoutMs?: number;
  /**
   * Windows triples `timeoutMs`/`idleTimeoutMs` to absorb process startup; false
   * keeps the exact ms. Pass false when the limit is a ceiling you chose and a
   * copy of it may be handed to the child (which would then fire first).
   */
  scaleWindowsTimeout?: boolean;
  /**
   * Upper bound on how much of each stream is kept, in characters. Overrun drops
   * the head and prefixes a notice, so the tail — where a CLI puts its result — is
   * what survives. Unbounded when unset.
   */
  maxOutputChars?: number;
  input?: string | Buffer;
  encoding?: BufferEncoding;
  normalizeEol?: boolean;
  /** Abort the child early (tree-kill via the same path as timeout). */
  signal?: AbortSignal;
  onStderr?: (chunk: string, accumulated: string) => boolean | void;
  /**
   * POSIX only: run the child as a process-group leader so a timeout/abort
   * kills the whole group (grandchildren too). Default off. Ignored on Windows
   * (which already tree-kills via `taskkill /T`) and by `spawnCliSync`.
   */
  detached?: boolean;
}

export interface SpawnResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  /** Which limit fired when `timedOut` is true. */
  timeoutKind?: "wall" | "idle";
  spawnError?: Error;
  abortedByCaller?: boolean;
}
