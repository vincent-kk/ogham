import spawn from "cross-spawn";
import { normalizeEol } from "../eol/index.js";
import { osTimeout } from "./os-timeout.js";
import type { SpawnOptions, SpawnResult } from "./types.js";

export function spawnCli(
  bin: string,
  args: readonly string[],
  options: SpawnOptions = {},
): Promise<SpawnResult> {
  const encoding = options.encoding ?? "utf8";
  const normalize = options.normalizeEol !== false;
  const timeoutMs =
    options.timeoutMs !== undefined ? osTimeout(options.timeoutMs) : undefined;

  return new Promise((resolve) => {
    const child = spawn(bin, [...args], {
      cwd: options.cwd,
      env: options.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let spawnError: Error | undefined;
    let settled = false;

    const timer = timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill("SIGKILL");
        }, timeoutMs)
      : null;

    function settle(code: number | null) {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve({
        code,
        stdout: normalize ? normalizeEol(stdout) : stdout,
        stderr: normalize ? normalizeEol(stderr) : stderr,
        timedOut,
        spawnError,
      });
    }

    child.on("error", (err) => {
      spawnError = err;
      settle(null);
    });

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString(encoding);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString(encoding);
    });

    if (options.input !== undefined && child.stdin) {
      child.stdin.write(options.input);
      child.stdin.end();
    } else if (child.stdin) {
      child.stdin.end();
    }

    child.on("close", (code) => settle(code));
  });
}
