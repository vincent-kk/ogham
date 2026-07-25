import type {
  ArtifactOutcome,
  ArtifactRevision,
} from "../../types/artifacts.js";
import type { FilePlan } from "../../transactions/index.js";
import type { RuleRevisionSpec } from "./internal.js";

export interface DirectoryRulePlanningItem {
  readonly outcome: ArtifactOutcome;
  readonly revision: ArtifactRevision;
  readonly revisionSpec: RuleRevisionSpec;
  readonly filePlan: FilePlan | null;
}
