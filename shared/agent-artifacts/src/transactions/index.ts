export type {
  ArtifactAction,
  ArtifactApplyResult,
  ArtifactOutcome,
  ArtifactPlan,
  ArtifactRevision,
} from "../types/artifacts.js";
export { applyFilePlan, createRevision } from "./transactions.js";
export type {
  ApplyFilePlanResult,
  FileChange,
  FilePlan,
} from "./transactions.js";
