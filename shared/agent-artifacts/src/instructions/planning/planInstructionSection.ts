import {
  mergeSection,
  removeSection,
} from "@ogham/cross-platform/instructions";
import { samePath } from "@ogham/cross-platform/paths";

import { createRevision } from "../../transactions/index.js";
import type { ArtifactOutcome } from "../../types/artifacts.js";
import type {
  CreateInstructionSectionManagerOptions,
  InstructionPlannedFile,
  InstructionSectionPlan,
  InstructionSectionRequest,
} from "../../types/instructions.js";
import { readInstructionCandidates } from "../status/readInstructionCandidates.js";
import { decideInstructionAction } from "./decideInstructionAction.js";

export function planInstructionSection(
  manager: CreateInstructionSectionManagerOptions,
  request: InstructionSectionRequest,
): InstructionSectionPlan {
  const baseRevisionPaths = [...new Set(manager.target.candidatePaths)];
  const revisionBeforeRead = createRevision(baseRevisionPaths);
  const snapshot = readInstructionCandidates({
    manager,
    selector: request.id === undefined ? {} : { id: request.id },
  });
  const inspection = snapshot.inspection;
  const sourcePath = inspection.sourcePath;
  const desiredContent = request.content?.trim() ?? null;
  const relocate =
    sourcePath !== null &&
    manager.target.placement === "effective" &&
    !samePath(sourcePath, manager.target.effectivePath);
  let action = decideInstructionAction({
    conflict: inspection.status === "conflict",
    sectionExists: sourcePath !== null,
    contentMatches:
      sourcePath !== null && inspection.sectionContent === desiredContent,
    remove: request.content === null,
    replaceDrift: request.replaceDrift,
    relocate,
  });

  const plannedFiles: InstructionPlannedFile[] = [];
  if (action === "copy" || action === "update") {
    const targetState = snapshot.candidates.find((candidate) =>
      samePath(candidate.path, inspection.target),
    );
    const source = targetState?.source ?? "";
    plannedFiles.push({
      target: inspection.target,
      content: mergeSection(source, snapshot.markers, request.content ?? ""),
      ...(request.backup === "sibling" &&
      targetState !== undefined &&
      targetState.source !== null
        ? { backupPath: `${inspection.target}.bak` }
        : {}),
    });
  } else if (action === "remove" && sourcePath !== null) {
    const sourceState = snapshot.candidates.find((candidate) =>
      samePath(candidate.path, sourcePath),
    );
    const source = sourceState?.source ?? "";
    plannedFiles.push({
      target: sourcePath,
      content: removeSection(source, snapshot.markers) ?? source,
      ...(request.backup === "sibling" &&
      sourceState !== undefined &&
      sourceState.source !== null
        ? { backupPath: `${sourcePath}.bak` }
        : {}),
    });
  } else if (action === "relocate" && sourcePath !== null) {
    const destinationState = snapshot.candidates.find((candidate) =>
      samePath(candidate.path, inspection.target),
    );
    const sourceState = snapshot.candidates.find((candidate) =>
      samePath(candidate.path, sourcePath),
    );
    const destinationSource = destinationState?.source ?? "";
    const hiddenSource = sourceState?.source ?? "";
    plannedFiles.push(
      {
        target: inspection.target,
        content: mergeSection(
          destinationSource,
          snapshot.markers,
          request.content ?? inspection.sectionContent ?? "",
        ),
        ...(request.backup === "sibling" &&
        destinationState !== undefined &&
        destinationState.source !== null
          ? { backupPath: `${inspection.target}.bak` }
          : {}),
      },
      {
        target: sourcePath,
        content: removeSection(hiddenSource, snapshot.markers) ?? hiddenSource,
        ...(request.backup === "sibling" &&
        sourceState !== undefined &&
        sourceState.source !== null
          ? { backupPath: `${sourcePath}.bak` }
          : {}),
      },
    );
  }

  const backupPaths = plannedFiles.flatMap((file) =>
    file.backupPath === undefined ? [] : [file.backupPath],
  );
  const revisionPaths = [...new Set([...baseRevisionPaths, ...backupPaths])];
  const expectedRevision = createRevision(revisionPaths);
  if (createRevision(baseRevisionPaths) !== revisionBeforeRead) {
    action = "conflict";
    plannedFiles.length = 0;
  }

  const reason =
    action === "conflict"
      ? (inspection.reason ?? "revision-changed-during-plan")
      : undefined;
  const outcome: ArtifactOutcome = {
    id: request.id ?? manager.owner,
    action,
    target:
      action === "remove" && sourcePath !== null
        ? sourcePath
        : inspection.target,
    ...(reason === undefined ? {} : { reason }),
  };

  return {
    request,
    outcomes: [outcome],
    revisions: revisionPaths.map((target) => ({
      target,
      revision: createRevision([target]),
    })),
    inspection,
    previews: plannedFiles.map((file) => ({
      target: file.target,
      content: file.content,
    })),
    plannedFiles,
    expectedRevision,
    revisionPaths,
    root: manager.target.root,
    lockTarget: manager.target.lockTarget,
    backupPaths: action === "conflict" ? [] : backupPaths,
  };
}
