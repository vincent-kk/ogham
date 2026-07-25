import { homedir } from "node:os";
import { join } from "node:path";

/** `null` for the `~user` form, which only a shell can resolve. */
export function expandAbsoluteRootHome(value: string): string | null {
  if (!value.startsWith("~")) return value;
  if (value === "~") return homedir();
  if (value.startsWith("~/")) return join(homedir(), value.slice(2));
  if (process.platform === "win32" && value.startsWith("~\\"))
    return join(homedir(), value.slice(2));
  return null;
}
