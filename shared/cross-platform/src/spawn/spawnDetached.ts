import spawn from "cross-spawn";

/**
 * Fire-and-forget detached spawn. The child is detached (POSIX: its own
 * process-group leader) and `unref`'d with `stdio: "ignore"`, so it outlives
 * the spawning process — use for background daemons that must survive the
 * parent's exit (e.g. a session finalizer spawned from a shutdown handler).
 *
 * Distinct from {@link spawnCli}, which is a *managed* call (awaited result,
 * timeout/abort tracking). `spawnDetached` returns nothing and tracks nothing.
 *
 * Best-effort: never throws. On any spawn failure the caller's fallback path
 * (e.g. next-boot recovery) stays intact. `command` should be an absolute
 * binary (e.g. `process.execPath`); cross-spawn handles Windows shim quirks.
 */
export function spawnDetached(
  command: string,
  args: string[] = [],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): void {
  try {
    const child = spawn(command, args, {
      stdio: "ignore",
      detached: true,
      windowsHide: true,
      cwd: options.cwd,
      env: options.env,
    });
    child.on("error", () => {});
    child.unref();
  } catch {
    /* best-effort — spawn failure leaves the caller's fallback intact */
  }
}
