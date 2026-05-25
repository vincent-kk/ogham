import { isWindowsLikePath } from "./is-windows-like-path.js";

export function pathForCompare(p: string): string {
  const normalized = p.replace(/\\/g, "/");
  return isWindowsLikePath(p) ? normalized.toLowerCase() : normalized;
}
