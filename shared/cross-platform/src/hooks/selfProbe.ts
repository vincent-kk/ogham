import { spawnCli } from "../spawn/index.js";
import { logHookFailure } from "./errorLog.js";
import type { ProbeResult } from "./types.js";

export interface SelfProbeOptions {
  writeLog?: boolean;
  pkg?: string;
  spawnTimeoutMs?: number;
}

export async function selfProbe(
  opts: SelfProbeOptions = {},
): Promise<ProbeResult> {
  const errors: string[] = [];
  const timeoutMs = opts.spawnTimeoutMs ?? 2000;

  const nodeResult = await spawnCli("node", ["--version"], { timeoutMs });
  const nodeOk = nodeResult.code === 0 && !nodeResult.spawnError;
  if (!nodeOk)
    errors.push(
      `node --version failed (code=${nodeResult.code}, error=${nodeResult.spawnError?.message ?? "none"})`,
    );

  const gitResult = await spawnCli("git", ["--version"], { timeoutMs });
  const gitOk = gitResult.code === 0 && !gitResult.spawnError;
  if (!gitOk)
    errors.push(
      `git --version failed (code=${gitResult.code}, error=${gitResult.spawnError?.message ?? "none"})`,
    );

  const pathEnv = process.env.PATH ?? process.env.Path ?? "";
  const pathLen = pathEnv.length;
  if (pathLen === 0) errors.push("PATH environment variable is empty");

  const pluginRootResolved = !!process.env.CLAUDE_PLUGIN_ROOT;
  if (!pluginRootResolved) errors.push("CLAUDE_PLUGIN_ROOT not set");

  const result: ProbeResult = {
    nodeOk,
    gitOk,
    pathLen,
    pluginRootResolved,
    errors,
  };

  if (opts.writeLog && errors.length > 0 && opts.pkg)
    logHookFailure(opts.pkg, "self-probe", { errors });

  return result;
}
