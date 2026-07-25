import type { ArtifactAction } from "../../types/artifacts.js";
import type {
  RuleDocumentPlan,
  RuleDocumentSource,
} from "../../types/rules.js";
import type { FilePlan } from "../../transactions/index.js";

export interface LocatedRuleDocument {
  readonly target: string;
  readonly displayTarget: string;
  readonly source: RuleDocumentSource;
  readonly sourceFilename: string | null;
  readonly content: string | Uint8Array | null;
}

export interface RuleActionDecision {
  readonly action: ArtifactAction;
  readonly reason?: string;
}

export interface StoredRuleDocumentInspection {
  readonly id: string;
  readonly target: string;
  readonly deployed: boolean;
  readonly inSync: boolean;
  readonly source: RuleDocumentSource;
}

export interface RuleRevisionSpec {
  readonly target: string;
  readonly revisionPaths: readonly string[];
}

export interface DirectoryRuleExecutionEntry {
  readonly outcomeIndex: number;
  readonly filePlan: FilePlan;
}

export interface DirectoryRuleExecution {
  readonly kind: "directory";
  readonly entries: readonly DirectoryRuleExecutionEntry[];
  readonly revisions: readonly RuleRevisionSpec[];
}

export interface SectionRuleExecution {
  readonly kind: "sections";
  readonly filePlan: FilePlan | null;
  readonly mutatingOutcomeIndexes: ReadonlySet<number>;
  readonly revisions: readonly RuleRevisionSpec[];
}

export type RuleExecution = DirectoryRuleExecution | SectionRuleExecution;

export interface PreparedRulePlan {
  readonly plan: RuleDocumentPlan;
  readonly execution: RuleExecution;
}
