export { env } from "./env/index.js";
export { normalizeEol } from "./eol/index.js";
export { paths } from "./paths/index.js";
export {
  detectHost,
  instructionsFile,
  pluginRoot,
  PROJECT_ROOT_ARG_DESCRIPTION,
  projectRoot,
  rememberProjectRoot,
  resetProjectRoot,
  ruleDocsTarget,
  tryProjectRoot,
} from "./hostPaths/index.js";
export type { RuleDocsTarget } from "./hostPaths/index.js";
export {
  HOST_MARKER_ENV,
  HOSTS,
  hostFromMarker,
  resolveHostDescriptor,
} from "./hostRegistry/index.js";
export type { Host, HostDescriptor } from "./hostRegistry/index.js";
export {
  CLAUDE_INSTRUCTIONS_FILE,
  CODEX_INSTRUCTIONS_FILE,
  INSTRUCTIONS_FILES,
  mergeSection,
  readSection,
  removeSection,
  sectionMarkers,
} from "./instructions/index.js";
export type { SectionMarkers } from "./instructions/index.js";
export { spawnCli, spawnCliSync, execCli, osTimeout } from "./spawn/index.js";
export type { SpawnOptions, SpawnResult } from "./spawn/index.js";
export { discover, binaries, installHints } from "./binaries/index.js";
export type { BinaryStatus, DiscoverOptions } from "./binaries/index.js";
export { runHookEntry, selfProbe, logHookFailure } from "./hooks/index.js";
export type {
  ProbeResult,
  SelfProbeOptions,
  LogHookFailureOptions,
} from "./hooks/index.js";
export { generateWindowsCmd } from "./shim/index.js";
export type { ShimOptions } from "./shim/index.js";
export { openBrowser } from "./launcher/index.js";
