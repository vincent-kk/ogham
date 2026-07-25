import { spawnSync } from "node:child_process";

import { logHookFailure } from "../error/logHookFailure.js";
import type { ProbeResult, SelfProbeOptions } from "../types.js";

export type { SelfProbeOptions } from "../types.js";

export async function selfProbeHook(
  opts: SelfProbeOptions = {},
): Promise<ProbeResult> {
  const requestedTimeout = opts.spawnTimeoutMs ?? 2000;
  const timeout =
    process.platform === "win32"
      ? Math.max(requestedTimeout * 3, 5000)
      : requestedTimeout;
  const nodeResult = spawnSync("node", ["--version"], {
    timeout,
    windowsHide: true,
    stdio: "ignore",
  });
  const gitResult = spawnSync("git", ["--version"], {
    timeout,
    windowsHide: true,
    stdio: "ignore",
  });
  const nodeOk = nodeResult.status === 0 && nodeResult.error === undefined;
  const gitOk = gitResult.status === 0 && gitResult.error === undefined;
  const errors: string[] = [];

  if (!nodeOk)
    errors.push(
      `node --version failed (code=${nodeResult.status}, error=${nodeResult.error?.message ?? "none"})`,
    );
  if (!gitOk)
    errors.push(
      `git --version failed (code=${gitResult.status}, error=${gitResult.error?.message ?? "none"})`,
    );

  const pathEnv = process.env.PATH ?? process.env.Path ?? "";
  const pathLen = pathEnv.length;
  if (pathLen === 0) errors.push("PATH environment variable is empty");

  const pluginRootResolved = Boolean(process.env.CLAUDE_PLUGIN_ROOT);
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
