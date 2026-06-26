export interface SpawnOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
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
  spawnError?: Error;
  abortedByCaller?: boolean;
}
