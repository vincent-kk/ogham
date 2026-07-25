export interface SelfProbeOptions {
  writeLog?: boolean;
  pkg?: string;
  spawnTimeoutMs?: number;
}

export interface ProbeResult {
  nodeOk: boolean;
  gitOk: boolean;
  pathLen: number;
  pluginRootResolved: boolean;
  errors: string[];
}
