import type { SectionMarkers } from "@ogham/cross-platform/instructions";

import type { SectionArtifactTarget } from "../targets/index.js";
import type { ArtifactApplyResult, ArtifactPlan } from "./artifacts.js";

export type InstructionBackup = "none" | "sibling";

export interface InstructionSectionSelector {
  readonly id?: string;
}

export interface InstructionSectionRequest {
  readonly id?: string;
  readonly content: string | null;
  readonly replaceDrift: boolean;
  readonly backup?: InstructionBackup;
}

export interface CreateInstructionSectionManagerOptions {
  readonly owner: string;
  readonly target: SectionArtifactTarget;
  readonly markers?: SectionMarkers;
}

export interface CreateResolvedInstructionSectionManagerOptions {
  readonly owner: string;
  readonly targetPath: string;
  readonly markers?: SectionMarkers;
  readonly root?: string;
}

export interface InstructionSectionInspection {
  readonly id: string;
  readonly status: "absent" | "present" | "conflict";
  readonly target: string;
  readonly sourcePath: string | null;
  readonly targetExists: boolean;
  readonly sectionContent: string | null;
  readonly reason?: string;
}

export interface InstructionFilePreview {
  readonly target: string;
  readonly content: string;
}

export interface InstructionPlannedFile extends InstructionFilePreview {
  readonly backupPath?: string;
}

export interface InstructionSectionPlan extends ArtifactPlan<InstructionSectionRequest> {
  readonly inspection: InstructionSectionInspection;
  readonly previews: readonly InstructionFilePreview[];
  readonly plannedFiles: readonly InstructionPlannedFile[];
  readonly expectedRevision: string;
  readonly revisionPaths: readonly string[];
  readonly root: string;
  readonly lockTarget: string;
  readonly backupPaths: readonly string[];
}

export interface InstructionSectionApplyResult extends ArtifactApplyResult {
  readonly backupPaths: readonly string[];
}

export interface InstructionSectionManager {
  inspect(selector?: InstructionSectionSelector): InstructionSectionInspection;
  plan(request: InstructionSectionRequest): InstructionSectionPlan;
  apply(plan: InstructionSectionPlan): InstructionSectionApplyResult;
}
