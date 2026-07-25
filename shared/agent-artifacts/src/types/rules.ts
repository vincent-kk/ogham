import type { ArtifactApplyResult, ArtifactPlan } from "./artifacts.js";
import type {
  DirectoryRuleTarget,
  SectionArtifactTarget,
} from "../targets/index.js";

export interface RuleDocumentSelector {
  readonly filename: string;
  readonly legacyFilenames?: readonly string[];
}

export interface ManagedRuleDocument extends RuleDocumentSelector {
  readonly id: string;
  readonly content: string | null;
}

export interface RuleDocumentRequest {
  readonly documents: readonly ManagedRuleDocument[];
  readonly desired: ReadonlySet<string>;
  readonly replaceDrift: ReadonlySet<string>;
}

export type RuleDocumentPlan = ArtifactPlan<RuleDocumentRequest>;

export type RuleDocumentSource = "current" | "legacy" | null;

export interface RuleDocumentInspection {
  readonly id: string;
  readonly filename: string;
  readonly target: string;
  readonly displayTarget: string;
  /** Whether a managed candidate stores this document. */
  readonly deployed: boolean;
  /** Whether the host currently reads this deployment from its effective target. */
  readonly active: boolean;
  readonly activeTarget: string;
  readonly activeDisplayTarget: string;
  readonly activeDeployedHash: string | null;
  readonly activeInSync: boolean;
  readonly activeSource: RuleDocumentSource;
  readonly deployedHash: string | null;
  readonly expectedHash: string | null;
  readonly inSync: boolean;
  readonly source: RuleDocumentSource;
}

export interface RuleDocumentPresence {
  readonly target: string;
  readonly displayTarget: string;
  readonly deployed: boolean;
}

export interface RuleDocumentManagerOptions {
  readonly owner: string;
  readonly target: DirectoryRuleTarget | SectionArtifactTarget;
}

export interface RuleDocumentManager {
  inspect(
    documents: readonly ManagedRuleDocument[],
  ): readonly RuleDocumentInspection[];
  plan(request: RuleDocumentRequest): RuleDocumentPlan;
  apply(plan: RuleDocumentPlan): ArtifactApplyResult;
}
