import type { SectionMarkers } from "@ogham/cross-platform";

import type {
  CreateInstructionSectionManagerOptions,
  InstructionSectionInspection,
  InstructionSectionSelector,
} from "../../types/instructions.js";

export interface InstructionCandidateState {
  readonly path: string;
  readonly source: string | null;
  readonly status: "absent" | "present" | "conflict";
  readonly sectionContent: string | null;
  readonly reason?: string;
}

export interface InstructionCandidateSnapshot {
  readonly markers: SectionMarkers;
  readonly inspection: InstructionSectionInspection;
  readonly candidates: readonly InstructionCandidateState[];
}

export interface InspectInstructionSectionOptions {
  readonly manager: CreateInstructionSectionManagerOptions;
  readonly selector?: InstructionSectionSelector;
}
