import { spawnCli } from "./spawnCli.js";
import type { SpawnOptions, SpawnResult } from "./types.js";

export function execCli(
  bin: string,
  args: readonly string[],
  options?: SpawnOptions,
): Promise<SpawnResult> {
  return spawnCli(bin, args, options);
}
