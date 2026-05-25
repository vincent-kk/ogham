import path from "node:path";

import { isPosixLikePath } from "./is-posix-like-path.js";
import { isWindowsLikePath } from "./is-windows-like-path.js";

type PathApi = typeof path.win32 | typeof path.posix | typeof path;

export function apiFor(...paths: string[]): PathApi {
  if (paths.some(isWindowsLikePath)) return path.win32;
  return paths.some(isPosixLikePath) ? path.posix : path;
}
