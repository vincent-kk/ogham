import spawn from "cross-spawn";
import { spawnSync as nodeSpawnSync } from "node:child_process";
import { normalizeEol } from "../eol/normalizeEol.js";
import { osTimeout } from "./osTimeout.js";
import { resolveLauncher } from "./resolveLauncher.js";
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

  const launcher = resolveLauncher(bin, { env: options.env });
  const result = launcher
    ? nodeSpawnSync(launcher.command, [...launcher.prependArgs, ...args], {
        cwd: options.cwd,
        env: options.env,
        input: options.input,
        timeout: timeoutMs,
        encoding,
        windowsVerbatimArguments: false,
        windowsHide: true,
      })
    : spawn.sync(bin, [...args], {
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
    abortedByCaller: false,
  };
}
