import { logHookFailure } from "@ogham/cross-platform/error-log";

export interface EnvironmentProbe {
  nodeOk: boolean;
  pathLen: number;
  pluginRootResolved: boolean;
  errors: string[];
}

export interface ProbeEnvironmentOptions {
  writeLog?: boolean;
  pkg?: string;
}

export function probeEnvironment(
  opts: ProbeEnvironmentOptions = {},
): EnvironmentProbe {
  const errors: string[] = [];

  const nodeOk = typeof process.versions.node === "string";
  if (!nodeOk) errors.push("node runtime not detected in process.versions");

  const pathEnv = process.env.PATH ?? process.env.Path ?? "";
  const pathLen = pathEnv.length;
  if (pathLen === 0) errors.push("PATH environment variable is empty");

  const pluginRootResolved = !!process.env.CLAUDE_PLUGIN_ROOT;
  if (!pluginRootResolved) errors.push("CLAUDE_PLUGIN_ROOT not set");

  if (opts.writeLog && errors.length > 0 && opts.pkg)
    logHookFailure(opts.pkg, "self-probe", { errors });

  return { nodeOk, pathLen, pluginRootResolved, errors };
}
