import spawn from "cross-spawn";
import { spawn as nodeSpawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import { normalizeEol } from "../eol/normalizeEol.js";
import { osTimeout } from "./osTimeout.js";
import { resolveLauncher } from "./resolveLauncher.js";
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
    const launcher = resolveLauncher(bin, { env: options.env });
    const stdoutDecoder = new StringDecoder(encoding);
    const stderrDecoder = new StringDecoder(encoding);
    const child = launcher
      ? nodeSpawn(launcher.command, [...launcher.prependArgs, ...args], {
          cwd: options.cwd,
          env: options.env,
          stdio: ["pipe", "pipe", "pipe"],
          windowsVerbatimArguments: false,
          windowsHide: true,
        })
      : spawn(bin, [...args], {
          cwd: options.cwd,
          env: options.env,
          stdio: ["pipe", "pipe", "pipe"],
        });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let abortedByCaller = false;
    let spawnError: Error | undefined;
    let settled = false;
    let timeoutSettleTimer: ReturnType<typeof setTimeout> | null = null;

    function killChild() {
      if (process.platform === "win32" && child.pid !== undefined)
        nodeSpawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
          stdio: "ignore",
        });
      else child.kill("SIGKILL");
    }

    const timer = timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          killChild();
          timeoutSettleTimer = setTimeout(() => settle(null), 1000);
        }, timeoutMs)
      : null;

    function settle(code: number | null) {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (timeoutSettleTimer) clearTimeout(timeoutSettleTimer);
      stdout += stdoutDecoder.end();
      stderr += stderrDecoder.end();
      resolve({
        code,
        stdout: normalize ? normalizeEol(stdout) : stdout,
        stderr: normalize ? normalizeEol(stderr) : stderr,
        timedOut,
        spawnError,
        abortedByCaller,
      });
    }

    child.on("error", (err) => {
      spawnError = err;
      settle(null);
    });

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += stdoutDecoder.write(chunk);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      const text = stderrDecoder.write(chunk);
      stderr += text;
      if (
        !settled &&
        !abortedByCaller &&
        options.onStderr?.(text, stderr) === true
      ) {
        abortedByCaller = true;
        killChild();
        timeoutSettleTimer = setTimeout(() => settle(null), 1000);
      }
    });

    if (options.input !== undefined && child.stdin) {
      child.stdin.write(options.input);
      child.stdin.end();
    } else if (child.stdin) child.stdin.end();

    child.on("close", (code) => settle(code));
  });
}
