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
  timeoutKind: "wall" | "idle" | undefined;
  abortedByCaller: boolean;
  spawnError: Error | undefined;
  settled: boolean;
  killed: boolean;
  timeoutSettleTimer: ReturnType<typeof setTimeout> | null;
}

interface SpawnHandle {
  child: ChildProcess;
  timer: ReturnType<typeof setTimeout> | null;
  idleTimer: ReturnType<typeof setTimeout> | null;
  idleTimeoutMs: number | undefined;
  stdoutDecoder: StringDecoder;
  stderrDecoder: StringDecoder;
  normalize: boolean;
  detached: boolean;
  options: SpawnOptions;
  resolve: (result: SpawnResult) => void;
  onAbortListener: (() => void) | undefined;
}

const OUTPUT_TRUNCATED_NOTICE =
  "[cross-platform] earlier output dropped: size cap reached";

// Bounds one stream without losing its end: a CLI's result sits in the last lines,
// and a partial line left at the front fails JSON parsing, which every consumer here
// already skips. The notice replaces the previous one on each overrun, so exactly one
// survives.
function appendCapped(
  current: string,
  chunk: string,
  max: number | undefined,
): string {
  const next = current + chunk;
  if (max === undefined || next.length <= max) return next;
  return `${OUTPUT_TRUNCATED_NOTICE}\n${next.slice(next.length - max)}`;
}

/** Idempotent kill (at most once). Windows tree-kills; POSIX group-kills when detached. */
function killChild(handle: SpawnHandle, state: SpawnState): void {
  if (state.killed) return;
  state.killed = true;
  const { child } = handle;
  if (process.platform === "win32") {
    if (child.pid !== undefined)
      nodeSpawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
      });
    return;
  }
  // A detached child leads its own process group, so a negative-pid signal
  // reaps grandchildren too. Require pid > 1: `kill(-0)` would target THIS
  // process's own group and does NOT throw, so try/catch cannot guard it.
  if (handle.detached && typeof child.pid === "number" && child.pid > 1)
    try {
      process.kill(-child.pid, "SIGKILL");
      return;
    } catch {
      // group already gone (ESRCH) or double-kill — single-process kill below
    }

  child.kill("SIGKILL");
}

function settle(
  handle: SpawnHandle,
  state: SpawnState,
  code: number | null,
): void {
  if (state.settled) return;
  state.settled = true;
  if (handle.timer) clearTimeout(handle.timer);
  if (handle.idleTimer) clearTimeout(handle.idleTimer);
  if (state.timeoutSettleTimer) clearTimeout(state.timeoutSettleTimer);
  const { onAbortListener } = handle;
  if (onAbortListener)
    handle.options.signal?.removeEventListener("abort", onAbortListener);
  const { maxOutputChars } = handle.options;
  state.stdout = appendCapped(
    state.stdout,
    handle.stdoutDecoder.end(),
    maxOutputChars,
  );
  state.stderr = appendCapped(
    state.stderr,
    handle.stderrDecoder.end(),
    maxOutputChars,
  );
  handle.resolve({
    code,
    stdout: handle.normalize ? normalizeEol(state.stdout) : state.stdout,
    stderr: handle.normalize ? normalizeEol(state.stderr) : state.stderr,
    timedOut: state.timedOut,
    timeoutKind: state.timeoutKind,
    spawnError: state.spawnError,
    abortedByCaller: state.abortedByCaller,
  });
}

function fireTimeout(
  handle: SpawnHandle,
  state: SpawnState,
  kind: "wall" | "idle",
): void {
  if (state.settled || state.timedOut || state.abortedByCaller) return;
  state.timedOut = true;
  state.timeoutKind = kind;
  killChild(handle, state);
  state.timeoutSettleTimer = setTimeout(
    () => settle(handle, state, null),
    1000,
  );
}

/** Restart the idle countdown — called on spawn and on every output chunk. */
function touchIdle(handle: SpawnHandle, state: SpawnState): void {
  const { idleTimeoutMs } = handle;
  if (idleTimeoutMs === undefined || state.settled) return;
  if (handle.idleTimer) clearTimeout(handle.idleTimer);
  handle.idleTimer = setTimeout(
    () => fireTimeout(handle, state, "idle"),
    idleTimeoutMs,
  );
}

// Disarms both limits: a child killed here is not going to emit again, so an idle
// timer left armed would fire during the settle delay and relabel this abort as a
// timeout. One settle timer only — overwriting an armed one orphans it.
function onAbort(handle: SpawnHandle, state: SpawnState): void {
  if (state.settled || state.abortedByCaller) return;
  state.abortedByCaller = true;
  if (handle.timer) clearTimeout(handle.timer);
  if (handle.idleTimer) clearTimeout(handle.idleTimer);
  killChild(handle, state);
  if (state.timeoutSettleTimer === null)
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
  const scaleForWindows = options.scaleWindowsTimeout !== false;
  const timeoutMs =
    options.timeoutMs !== undefined
      ? osTimeout(options.timeoutMs, scaleForWindows)
      : undefined;
  const idleTimeoutMs =
    options.idleTimeoutMs !== undefined
      ? osTimeout(options.idleTimeoutMs, scaleForWindows)
      : undefined;
  const useDetached = options.detached === true && process.platform !== "win32";

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
          detached: useDetached,
        });

    const state: SpawnState = {
      stdout: "",
      stderr: "",
      timedOut: false,
      timeoutKind: undefined,
      abortedByCaller: false,
      spawnError: undefined,
      settled: false,
      killed: false,
      timeoutSettleTimer: null,
    };
    const handle: SpawnHandle = {
      child,
      timer: null,
      idleTimer: null,
      idleTimeoutMs,
      stdoutDecoder,
      stderrDecoder,
      normalize,
      detached: useDetached,
      options,
      resolve,
      onAbortListener: undefined,
    };

    const onAbortListener = () => onAbort(handle, state);
    handle.onAbortListener = onAbortListener;
    handle.timer = timeoutMs
      ? setTimeout(() => fireTimeout(handle, state, "wall"), timeoutMs)
      : null;
    touchIdle(handle, state);

    if (options.signal)
      if (options.signal.aborted) onAbortListener();
      else
        options.signal.addEventListener("abort", onAbortListener, {
          once: true,
        });

    child.on("error", (err) => {
      state.spawnError = err;
      settle(handle, state, null);
    });

    child.stdout?.on("data", (chunk: Buffer) => {
      touchIdle(handle, state);
      state.stdout = appendCapped(
        state.stdout,
        stdoutDecoder.write(chunk),
        options.maxOutputChars,
      );
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      touchIdle(handle, state);
      const text = stderrDecoder.write(chunk);
      state.stderr = appendCapped(state.stderr, text, options.maxOutputChars);
      if (
        !state.settled &&
        !state.abortedByCaller &&
        options.onStderr?.(text, state.stderr) === true
      )
        onAbort(handle, state);
    });

    if (options.input !== undefined && child.stdin) {
      child.stdin.write(options.input);
      child.stdin.end();
    } else if (child.stdin) child.stdin.end();

    child.on("close", (code) => settle(handle, state, code));
  });
}
