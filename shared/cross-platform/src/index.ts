// Public contract of @ogham/cross-platform. Consumers import from the package root;
// there are no subpath addresses. Every symbol below is re-exported by name
// from the file that owns it — a wildcard would let an internal rename widen
// this contract silently.

export { agyEventFor } from "./agyHooks/eventMap.js";
export { claudeToAgyResponse } from "./agyHooks/toAgyResponse.js";
export { agyToClaudeInput } from "./agyHooks/toClaudeInput.js";
export { agyToolToClaude } from "./agyHooks/toolMap.js";
export type {
  AgyCommonInput,
  AgyHookEvent,
  AgyHookResponse,
  AgyInjectStep,
  AgyToolCall,
  ClaudeHookEvent,
  ClaudeHookInput,
  ClaudeHookOutput,
} from "./agyHooks/types.js";
export { runAgyHook } from "./agyRunner/runAgyHook.js";
export type { RunAgyHookDeps } from "./agyRunner/runAgyHook.js";
export { claimSessionStartOnce } from "./agyRunner/sessionOnce.js";
export { binaries, discover } from "./binaries/discover.js";
export type { DiscoverOptions } from "./binaries/discover.js";
export { installHints } from "./binaries/installHints.js";
export type { BinaryStatus } from "./binaries/types.js";
export { normalizeCodexToolUses } from "./codexHooks/normalizeToolUse.js";
export { parseApplyPatch } from "./codexHooks/parseApplyPatch.js";
export { parseBashRead } from "./codexHooks/parseBashRead.js";
export type {
  ApplyPatchOp,
  CodexToolUse,
  NormalizedCodexToolUse,
  NormalizeCodexToolUsesResult,
  ParseApplyPatchResult,
} from "./codexHooks/types.js";
export { buildConfigScopeState } from "./configScope/layers/operations/buildConfigScopeState.js";
export { readConfigLayers } from "./configScope/layers/operations/readConfigLayers.js";
export { resolveConfigLayers } from "./configScope/layers/operations/resolveConfigLayers.js";
export { writeConfigLayer } from "./configScope/layers/operations/writeConfigLayer.js";
export { clearConfigPaths } from "./configScope/merge/operations/clearConfigPaths.js";
export { listOverriddenPaths } from "./configScope/merge/operations/listOverriddenPaths.js";
export { mergeConfigLayers } from "./configScope/merge/operations/mergeConfigLayers.js";
export type {
  ConfigLayerDocuments,
  ConfigLayerPaths,
  ConfigScope,
  ConfigScopeState,
  ResolveConfigLayersOptions,
} from "./configScope/types/types.js";
export { env } from "./env/env.js";
export { normalizeEol } from "./eol/normalizeEol.js";
export { copyFileSync } from "./filesystem/hookIo/operations/copyFileSync.js";
export { writeUtf8FileSync } from "./filesystem/hookIo/operations/writeUtf8FileSync.js";
export { withFileLockSync } from "./filesystem/locking/operations/withFileLockSync.js";
export { ensureDirectorySync } from "./filesystem/mutation/ensureDirectorySync.js";
export { removeFileIfExistsSync } from "./filesystem/mutation/removeFileIfExistsSync.js";
export { writeFileAtomicallySync } from "./filesystem/mutation/writeFileAtomicallySync.js";
export { canonicalizeTargetPathSync } from "./filesystem/read/canonicalizeTargetPathSync.js";
export { listDirectoryIfExistsSync } from "./filesystem/read/listDirectoryIfExistsSync.js";
export { readFileIfExistsSync } from "./filesystem/read/readFileIfExistsSync.js";
export { readUtf8FileIfExistsSync } from "./filesystem/read/readUtf8FileIfExistsSync.js";
export { assertNoSymlinkDescendantsSync } from "./filesystem/safety/assertNoSymlinkDescendantsSync.js";
export type {
  AtomicWriteOptions,
  EnsureDirectoryOptions,
  FileLockOptions,
  FileLockResult,
} from "./filesystem/types/types.js";
export { runHookEntry } from "./hooks/bootstrap.js";
export { errorLogPath } from "./hooks/error/errorLogPath.js";
export { logHookFailure } from "./hooks/error/logHookFailure.js";
export type { LogHookFailureOptions } from "./hooks/error/logHookFailure.js";
export { selfProbeHook } from "./hooks/probe/selfProbeHook.js";
export { selfProbe } from "./hooks/selfProbe.js";
export type { ProbeResult, SelfProbeOptions } from "./hooks/types.js";
export { requireAbsoluteRoot } from "./hostPaths/absolute/requireAbsoluteRoot.js";
export { toAbsoluteRoot } from "./hostPaths/absolute/toAbsoluteRoot.js";
export { detectHost } from "./hostPaths/detectHost.js";
export {
  instructionsFile,
  ruleDocsTarget,
} from "./hostPaths/instructionsChannel.js";
export { pluginRoot } from "./hostPaths/pluginRoot.js";
export {
  PROJECT_ROOT_ARG_DESCRIPTION,
  projectRoot,
  tryProjectRoot,
} from "./hostPaths/projectRoot.js";
export {
  readRememberedProjectRoot,
  rememberProjectRoot,
  resetProjectRoot,
} from "./hostPaths/projectRootMemo.js";
export type { RuleDocsTarget } from "./hostPaths/types.js";
export { hostFromMarker } from "./hostRegistry/operations/hostFromMarker.js";
export { HOSTS, HOST_MARKER_ENV } from "./hostRegistry/operations/registry.js";
export { resolveHostDescriptor } from "./hostRegistry/operations/resolveHostDescriptor.js";
export type {
  Host,
  HostDescriptor,
  KnownHost,
} from "./hostRegistry/operations/types.js";
export { resolveRuntimeHost } from "./hostRegistry/runtime/resolveRuntimeHost.js";
export {
  CLAUDE_INSTRUCTIONS_FILE,
  CODEX_INSTRUCTIONS_FILE,
  INSTRUCTIONS_FILES,
} from "./instructions/operations/files.js";
export { mergeSection } from "./instructions/operations/mergeSection.js";
export { readSection } from "./instructions/operations/readSection.js";
export { removeSection } from "./instructions/operations/removeSection.js";
export { sectionMarkers } from "./instructions/operations/sectionMarkers.js";
export type { SectionMarkers } from "./instructions/operations/types.js";
export { NO_BROWSER_ENV, openBrowser } from "./launcher/openBrowser.js";
export { isPosixLikePath } from "./paths/compat/operations/isPosixLikePath.js";
export { isWindowsLikePath } from "./paths/compat/operations/isWindowsLikePath.js";
export { pathForCompare } from "./paths/compat/operations/pathForCompare.js";
export { portableBasename } from "./paths/compat/operations/portableBasename.js";
export { portableDirname } from "./paths/compat/operations/portableDirname.js";
export { portableIsAbsolute } from "./paths/compat/operations/portableIsAbsolute.js";
export { portableJoin } from "./paths/compat/operations/portableJoin.js";
export { portableRelative } from "./paths/compat/operations/portableRelative.js";
export { portableResolve } from "./paths/compat/operations/portableResolve.js";
export { samePath } from "./paths/compat/operations/samePath.js";
export { normalize } from "./paths/operations/normalize.js";
export { resolveContainedPath } from "./paths/operations/resolveContainedPath.js";
export { cacheDir } from "./paths/state/cacheDir.js";
export { configDir } from "./paths/state/configDir.js";
export { home } from "./paths/state/home.js";
export { hostStateRoot } from "./paths/state/hostStateRoot.js";
export { pluginCache } from "./paths/state/pluginCache.js";
export { tmp } from "./paths/state/tmp.js";
export { generateWindowsCmd } from "./shim/generateWindowsCmd.js";
export type { ShimOptions } from "./shim/generateWindowsCmd.js";
export { execCli } from "./spawn/execCli.js";
export { osTimeout } from "./spawn/osTimeout.js";
export { spawnCli } from "./spawn/spawnCli.js";
export { spawnCliSync } from "./spawn/spawnCliSync.js";
export { spawnDetached } from "./spawn/spawnDetached.js";
export type { SpawnOptions, SpawnResult } from "./spawn/types.js";
