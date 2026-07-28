import { env } from "../env/index.js";

// Windows process startup can consume most of a short allowance, so a timeout is
// tripled there (floor 5 s). A caller whose number is a deliberate ceiling — a tier
// cap, a test pinning a budget — passes `scaleWindowsTimeout: false` and keeps it.
// The size of the number says nothing about which kind it is.
export function osTimeout(ms: number, scaleForWindows = true): number {
  if (!env.isWindows || !scaleForWindows) return ms;
  return Math.max(ms * 3, 5000);
}
