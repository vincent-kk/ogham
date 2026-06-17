export interface SpawnOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  input?: string | Buffer;
  encoding?: BufferEncoding;
  normalizeEol?: boolean;
  onStderr?: (chunk: string, accumulated: string) => boolean | void;
}

export interface SpawnResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  spawnError?: Error;
  abortedByCaller?: boolean;
}
