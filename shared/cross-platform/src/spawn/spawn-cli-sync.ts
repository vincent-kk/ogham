import spawn from "cross-spawn";
import { normalizeEol } from "../eol/index.js";
import { osTimeout } from "./os-timeout.js";
import type { SpawnOptions, SpawnResult } from "./types.js";

export function spawnCliSync(
  bin: string,
  args: readonly string[],
  options: SpawnOptions = {},
): SpawnResult {
  const encoding = options.encoding ?? "utf8";
  const normalize = options.normalizeEol !== false;
  const timeoutMs =
    options.timeoutMs !== undefined ? osTimeout(options.timeoutMs) : undefined;

  const result = spawn.sync(bin, [...args], {
    cwd: options.cwd,
    env: options.env,
    input: options.input,
    timeout: timeoutMs,
    encoding,
  });

  const rawStdout = result.stdout ?? "";
  const rawStderr = result.stderr ?? "";

  return {
    code: result.status,
    stdout: normalize ? normalizeEol(rawStdout) : rawStdout,
    stderr: normalize ? normalizeEol(rawStderr) : rawStderr,
    timedOut: result.signal === "SIGTERM" && timeoutMs !== undefined,
    spawnError: result.error ?? undefined,
  };
}
