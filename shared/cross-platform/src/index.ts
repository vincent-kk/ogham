export {
  buildConfigScopeState,
  clearConfigPaths,
  listOverriddenPaths,
  mergeConfigLayers,
  readConfigLayers,
  resolveConfigLayers,
  writeConfigLayer,
} from "./configScope/index.js";
export type {
  ConfigLayerDocuments,
  ConfigLayerPaths,
  ConfigScope,
  ConfigScopeState,
  ResolveConfigLayersOptions,
} from "./configScope/index.js";
export { env } from "./env/index.js";
export { normalizeEol } from "./eol/index.js";
export { hostStateRoot, paths, resolveContainedPath } from "./paths/index.js";
export {
  assertNoSymlinkDescendantsSync,
  ensureDirectorySync,
  listDirectoryIfExistsSync,
  readFileIfExistsSync,
  readUtf8FileIfExistsSync,
  removeFileIfExistsSync,
  withFileLockSync,
  writeFileAtomicallySync,
} from "./filesystem/index.js";
export type {
  AtomicWriteOptions,
  EnsureDirectoryOptions,
  FileLockOptions,
  FileLockResult,
} from "./filesystem/index.js";
export {
  detectHost,
  instructionsFile,
  pluginRoot,
  PROJECT_ROOT_ARG_DESCRIPTION,
  projectRoot,
  requireAbsoluteRoot,
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
  resolveRuntimeHost,
} from "./hostRegistry/index.js";
export type { Host, HostDescriptor, KnownHost } from "./hostRegistry/index.js";
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
export {
  errorLogPath,
  logHookFailure,
  runHookEntry,
  selfProbe,
} from "./hooks/index.js";
export type {
  ProbeResult,
  SelfProbeOptions,
  LogHookFailureOptions,
} from "./hooks/index.js";
export { generateWindowsCmd } from "./shim/index.js";
export type { ShimOptions } from "./shim/index.js";
export { NO_BROWSER_ENV, openBrowser } from "./launcher/index.js";
