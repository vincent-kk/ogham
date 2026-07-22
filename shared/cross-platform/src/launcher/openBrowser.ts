import spawn from "cross-spawn";

/**
 * Set to any non-empty value to suppress every browser launch in this process.
 *
 * One switch for the whole monorepo, named after the `OGHAM_` env namespace the
 * adapters already use. It replaces three per-plugin variables that had drifted
 * apart — `FILID_`, `IMBAS_` and `DEILEN_NO_BROWSER` — and left the atlassian,
 * cennad and entrez call sites with no switch at all, so a test touching one of
 * those opened a real tab on every run.
 *
 * Any non-empty value counts. The old variables required exactly `"1"`, which is
 * a rule to remember for no benefit; the goal is to be hard to get wrong from a
 * shell, a CI config, or a test setup.
 */
export const NO_BROWSER_ENV = "OGHAM_NO_BROWSER";

/** Open `url` in the user's default browser. Best-effort: headless / CI /
 *  SSH environments silently no-op so the caller can still surface the URL.
 *  Uses detached + unref so the browser outlives the spawning process.
 *  Honours `NO_BROWSER_ENV` — callers keep returning the URL either way. */
export function openBrowser(url: string): void {
  if (process.env[NO_BROWSER_ENV]) return;

  try {
    const [bin, args]: [string, string[]] =
      process.platform === "darwin"
        ? ["open", [url]]
        : process.platform === "win32"
          ? ["cmd.exe", ["/c", "start", "", url]]
          : ["xdg-open", [url]];
    const child = spawn(bin, args, {
      stdio: "ignore",
      detached: true,
    });
    child.on("error", () => {});
    child.unref();
  } catch {
    /* headless / unsupported — caller falls back to displaying the URL */
  }
}
