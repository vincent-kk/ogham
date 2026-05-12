import { execFile } from "node:child_process";

/** Open a URL in the user's default browser. Uses execFile with an explicit
 *  argument vector so attacker-controlled URLs cannot escape into the shell —
 *  defense-in-depth even though the caller passes a server-generated
 *  http://127.0.0.1 URL. On Windows, `start` is a cmd.exe builtin and cannot
 *  be spawned directly; `cmd.exe /c start "" <url>` is the canonical form,
 *  where the empty `""` prevents `start` from consuming a quoted URL as the
 *  window title. */
export function openBrowser(url: string): void {
  if (process.platform === "darwin") {
    execFile("open", [url]);
  } else if (process.platform === "win32") {
    execFile("cmd.exe", ["/c", "start", "", url]);
  } else {
    execFile("xdg-open", [url]);
  }
}
