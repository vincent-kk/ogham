import type { SectionMarkers } from "@ogham/cross-platform";

import type { SectionArtifactTarget } from "../../../targets/index.js";
import type { InstructionBackup } from "../../../types/instructions.js";

export type HookInstructionConflictReason =
  "malformed-markers" | "duplicate-markers" | "multiple-candidates";

export interface HookInstructionSectionOptions {
  readonly target: SectionArtifactTarget;
  readonly markers: SectionMarkers;
}

export interface ApplyHookInstructionSectionOptions extends HookInstructionSectionOptions {
  readonly content: string;
  readonly backup?: InstructionBackup;
}

export interface HookInstructionSectionInspection {
  readonly status: "absent" | "present" | "conflict";
  readonly target: string;
  readonly sourcePath: string | null;
  readonly sectionContent: string | null;
  readonly reason?: HookInstructionConflictReason;
}

export interface HookInstructionSectionApplyResult {
  readonly status: "applied" | "unchanged" | "conflict";
  readonly target: string;
  readonly backupPaths: readonly string[];
  readonly reason?: HookInstructionConflictReason;
}

export type HookInstructionSnapshot = readonly [
  target: string,
  targetSource: string | null,
  sourcePath: string | null,
  sourceSource: string | null,
  sectionContent: string | null,
  conflictReason: HookInstructionConflictReason | null,
];
