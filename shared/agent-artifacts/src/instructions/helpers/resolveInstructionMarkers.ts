import {
  sectionMarkers,
  type SectionMarkers,
} from "@ogham/cross-platform/instructions";

import type {
  CreateInstructionSectionManagerOptions,
  InstructionSectionSelector,
} from "../../types/instructions.js";

const SECTION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function resolveInstructionMarkers(
  manager: CreateInstructionSectionManagerOptions,
  selector: InstructionSectionSelector,
): SectionMarkers {
  if (selector.id !== undefined && !SECTION_ID_PATTERN.test(selector.id))
    throw new Error(`Invalid instruction section id: "${selector.id}"`);

  const markers =
    manager.markers ?? sectionMarkers(manager.owner.toUpperCase(), selector.id);
  if (
    markers.start.length === 0 ||
    markers.end.length === 0 ||
    markers.start === markers.end
  )
    throw new Error("Instruction markers must be non-empty and distinct");
  return markers;
}
