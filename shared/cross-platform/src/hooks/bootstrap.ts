import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

export async function runHookEntry(
  target: string,
  argv: string[],
): Promise<number> {
  if (!existsSync(target)) return 1;

  const result = spawnSync(process.execPath, [target, ...argv], {
    stdio: "inherit",
    windowsHide: true,
  });
  return result.status ?? 1;
}
