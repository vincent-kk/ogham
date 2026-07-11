import { spawnDetached } from "@ogham/cross-platform/spawn";

import { DEFAULT_FINALIZE_FLAG } from "../constants/finalizeFlag.js";

export interface ShutdownFinalizerOptions {
  /** Context string handed to `guard`/`onShutdown` and the detached child (vault/project path). */
  ctx: string;
  /** Gate — handlers run only when this returns true (e.g. `isMaencofVault`). */
  guard?: (ctx: string) => boolean;
  /** Synchronous in-grace cleanup (discard turn-context, precise close, cache removal). No async/git. */
  onShutdown?: (ctx: string) => void;
  /**
   * When true, SIGINT/SIGTERM additionally spawns a detached
   * `node <process.argv[1]> <flag> <ctx>` so heavy async completion runs off the
   * grace window. The entry point must dispatch `<flag>` via `runFinalizer`.
   */
  detached?: boolean;
  /** Finalize flag paired with `runFinalizer` (default `'--finalize'`). */
  flag?: string;
}

let registered = false;

const SHUTDOWN_SIGNALS = ["SIGINT", "SIGTERM"] as const;

/**
 * Registers exit/SIGINT/SIGTERM handlers once for a server process.
 *
 * - `exit` → `onShutdown` only (synchronous, best-effort).
 * - SIGINT/SIGTERM → `onShutdown` → (when `detached`) spawn the finalizer →
 *   `process.exit(0)`.
 *
 * Repeat calls are ignored (once-guard). The host SIGKILLs ~400ms after the
 * signal, so `onShutdown` must stay synchronous; defer heavy work to the
 * detached finalizer.
 */
export function registerShutdownFinalizer(
  opts: ShutdownFinalizerOptions,
): void {
  if (registered) return;
  registered = true;
  const {
    ctx,
    guard,
    onShutdown,
    detached = false,
    flag = DEFAULT_FINALIZE_FLAG,
  } = opts;

  const shutdown = (): void => {
    if (guard && !guard(ctx)) return;
    onShutdown?.(ctx);
  };
  const spawnFinalizer = (): void => {
    if (guard && !guard(ctx)) return;
    const entry = process.argv[1];
    if (entry) spawnDetached(process.execPath, [entry, flag, ctx]);
  };

  process.once("exit", shutdown);
  for (const signal of SHUTDOWN_SIGNALS)
    process.once(signal, () => {
      shutdown();
      if (detached) spawnFinalizer();
      process.exit(0);
    });
}
