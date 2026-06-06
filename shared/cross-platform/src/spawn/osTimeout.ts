import { env } from "../env/env.js";

export function osTimeout(ms: number): number {
  return env.isWindows ? Math.max(ms * 3, 5000) : ms;
}
