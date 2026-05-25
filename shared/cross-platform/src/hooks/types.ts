export interface ProbeResult {
  nodeOk: boolean;
  gitOk: boolean;
  pathLen: number;
  pluginRootResolved: boolean;
  errors: string[];
}
