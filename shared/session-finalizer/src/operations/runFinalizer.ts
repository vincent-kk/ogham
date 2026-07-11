import { DEFAULT_FINALIZE_FLAG } from "../constants/finalizeFlag.js";

/**
 * Server-entry dispatch for the detached finalizer.
 *
 * When `argv` carries `<flag> <ctx>` (as spawned by `registerShutdownFinalizer`
 * with `detached`), runs `task(ctx)` once and exits 0 once it settles, returning
 * `true` so the caller skips normal server start. Returns `false` when the flag
 * is absent (normal boot). `task` must absorb its own errors.
 */
export function runFinalizer(
  argv: string[],
  task: (ctx: string) => void | Promise<void>,
  flag: string = DEFAULT_FINALIZE_FLAG,
): boolean {
  const idx = argv.indexOf(flag);
  if (idx === -1) return false;
  const ctx = argv[idx + 1];
  if (ctx) void Promise.resolve(task(ctx)).finally(() => process.exit(0));
  else process.exit(0);
  return true;
}
