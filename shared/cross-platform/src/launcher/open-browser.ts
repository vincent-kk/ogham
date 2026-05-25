import spawn from "cross-spawn";

/** Open `url` in the user's default browser. Best-effort: headless / CI /
 *  SSH environments silently no-op so the caller can still surface the URL.
 *  Uses detached + unref so the browser outlives the spawning process. */
export function openBrowser(url: string): void {
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
