import { isWindowsLikePath } from "./isWindowsLikePath.js";

export function pathForCompare(p: string): string {
  const normalized = p.replace(/\\/g, "/");
  return isWindowsLikePath(p) ? normalized.toLowerCase() : normalized;
}
