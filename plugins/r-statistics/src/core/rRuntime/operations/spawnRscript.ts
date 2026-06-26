import { spawnCli } from "@ogham/cross-platform";

export interface SpawnRscriptOptions {
  rscriptPath: string;
  scriptPath: string;
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  signal?: AbortSignal;
}

export interface SpawnRscriptResult {
  exitCode: number | null;
  stdout: Buffer;
  stderr: Buffer;
  timedOut: boolean;
  aborted: boolean;
  spawnError?: Error;
}

/**
 * Spawn `Rscript --vanilla <script>` through the cross-platform CLI layer
 * (cross-spawn binary resolution, Windows tree-kill via taskkill, windowsHide).
 * Output is captured as latin1 — a lossless byte round-trip — so the raw bytes
 * survive for `decodeOutput`'s UTF-8 → CP949 fallback. An AbortSignal (from
 * cancel-r-job) or timeout tree-kills the child early — `detached` group-kills
 * on POSIX so R-spawned child processes (e.g. parallel workers) are reaped too.
 */
export async function spawnRscript(
  options: SpawnRscriptOptions,
): Promise<SpawnRscriptResult> {
  const result = await spawnCli(
    options.rscriptPath,
    ["--vanilla", options.scriptPath],
    {
      cwd: options.cwd,
      env: options.env,
      timeoutMs: options.timeoutMs,
      signal: options.signal,
      encoding: "latin1",
      normalizeEol: false,
      detached: true,
    },
  );

  return {
    exitCode: result.code,
    stdout: Buffer.from(result.stdout, "latin1"),
    stderr: Buffer.from(result.stderr, "latin1"),
    timedOut: result.timedOut,
    aborted: result.abortedByCaller ?? false,
    spawnError: result.spawnError,
  };
}
