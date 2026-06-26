export {
  discoverRscript,
  spawnRscript,
  decodeOutput,
  type SpawnRscriptOptions,
  type SpawnRscriptResult,
} from "./rRuntime/index.js";
export {
  createWorkspace,
  collectArtifacts,
  readManifest,
  pruneExpired,
  type WorkspaceHandle,
} from "./workspace/index.js";
export {
  validateCommand,
  resolveInstaller,
  validateRScript,
  type InstallerCommand,
  type RScriptValidation,
} from "./commandGate/index.js";
export {
  createJob,
  getJob,
  updateJob,
  cancelJob,
  cancelAllJobs,
  hasActiveWorkspaceJob,
  type RJob,
  type CreateJobInput,
} from "./jobStore/index.js";
