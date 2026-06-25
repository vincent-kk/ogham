import spawn from "cross-spawn";
import { spawn as nodeSpawn, type ChildProcess } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import { normalizeEol } from "../eol/index.js";
import { osTimeout } from "./osTimeout.js";
import { resolveLauncher } from "./resolveLauncher.js";
import type { SpawnOptions, SpawnResult } from "./types.js";

interface SpawnState {
  stdout: string;
  stderr: string;
  timedOut: boolean;
  abortedByCaller: boolean;
  spawnError: Error | undefined;
  settled: boolean;
  timeoutSettleTimer: ReturnType<typeof setTimeout> | null;
}

interface SpawnHandle {
  child: ChildProcess;
  timer: ReturnType<typeof setTimeout> | null;
  stdoutDecoder: StringDecoder;
  stderrDecoder: StringDecoder;
  normalize: boolean;
  options: SpawnOptions;
  resolve: (result: SpawnResult) => void;
  onAbortListener: (() => void) | undefined;
}

function killChild(child: ChildProcess): void {
  if (process.platform === "win32" && child.pid !== undefined)
    nodeSpawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  else child.kill("SIGKILL");
}

function settle(
  handle: SpawnHandle,
  state: SpawnState,
  code: number | null,
): void {
  if (state.settled) return;
  state.settled = true;
  if (handle.timer) clearTimeout(handle.timer);
  if (state.timeoutSettleTimer) clearTimeout(state.timeoutSettleTimer);
  const { onAbortListener } = handle;
  if (onAbortListener)
    handle.options.signal?.removeEventListener("abort", onAbortListener);
  state.stdout += handle.stdoutDecoder.end();
  state.stderr += handle.stderrDecoder.end();
  handle.resolve({
    code,
    stdout: handle.normalize ? normalizeEol(state.stdout) : state.stdout,
    stderr: handle.normalize ? normalizeEol(state.stderr) : state.stderr,
    timedOut: state.timedOut,
    spawnError: state.spawnError,
    abortedByCaller: state.abortedByCaller,
  });
}

function onAbort(handle: SpawnHandle, state: SpawnState): void {
  if (state.settled || state.abortedByCaller) return;
  state.abortedByCaller = true;
  killChild(handle.child);
  state.timeoutSettleTimer = setTimeout(
    () => settle(handle, state, null),
    1000,
  );
}

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

    const state: SpawnState = {
      stdout: "",
      stderr: "",
      timedOut: false,
      abortedByCaller: false,
      spawnError: undefined,
      settled: false,
      timeoutSettleTimer: null,
    };
    const handle: SpawnHandle = {
      child,
      timer: null,
      stdoutDecoder,
      stderrDecoder,
      normalize,
      options,
      resolve,
      onAbortListener: undefined,
    };

    const onAbortListener = () => onAbort(handle, state);
    handle.onAbortListener = onAbortListener;
    handle.timer = timeoutMs
      ? setTimeout(() => {
          state.timedOut = true;
          killChild(child);
          state.timeoutSettleTimer = setTimeout(
            () => settle(handle, state, null),
            1000,
          );
        }, timeoutMs)
      : null;

    if (options.signal) {
      if (options.signal.aborted) onAbortListener();
      else
        options.signal.addEventListener("abort", onAbortListener, {
          once: true,
        });
    }

    child.on("error", (err) => {
      state.spawnError = err;
      settle(handle, state, null);
    });

    child.stdout?.on("data", (chunk: Buffer) => {
      state.stdout += stdoutDecoder.write(chunk);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      const text = stderrDecoder.write(chunk);
      state.stderr += text;
      if (
        !state.settled &&
        !state.abortedByCaller &&
        options.onStderr?.(text, state.stderr) === true
      ) {
        state.abortedByCaller = true;
        killChild(child);
        state.timeoutSettleTimer = setTimeout(
          () => settle(handle, state, null),
          1000,
        );
      }
    });

    if (options.input !== undefined && child.stdin) {
      child.stdin.write(options.input);
      child.stdin.end();
    } else if (child.stdin) child.stdin.end();

    child.on("close", (code) => settle(handle, state, code));
  });
}
