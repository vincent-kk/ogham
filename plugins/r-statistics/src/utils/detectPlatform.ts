import { Platform } from "../types/enums.js";

export function detectPlatform(): Platform {
  if (process.platform === "win32") return Platform.Windows;
  if (process.platform === "darwin") return Platform.Macos;
  return Platform.Linux;
}
