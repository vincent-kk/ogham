import {
  readUtf8FileIfExistsSync,
  readSection,
  samePath,
} from "@ogham/cross-platform";

import { resolveInstructionMarkers } from "../helpers/resolveInstructionMarkers.js";
import type {
  InspectInstructionSectionOptions,
  InstructionCandidateSnapshot,
  InstructionCandidateState,
} from "./types.js";

export function readInstructionCandidates(
  options: InspectInstructionSectionOptions,
): InstructionCandidateSnapshot {
  const selector = options.selector ?? {};
  const markers = resolveInstructionMarkers(options.manager, selector);
  const candidates: InstructionCandidateState[] = [];

  for (const path of [...new Set(options.manager.target.candidatePaths)]) {
    const source = readUtf8FileIfExistsSync(path);
    if (source === null) {
      candidates.push({
        path,
        source,
        status: "absent",
        sectionContent: null,
      });
      continue;
    }

    const startCount = source.split(markers.start).length - 1;
    const endCount = source.split(markers.end).length - 1;
    if (startCount === 0 && endCount === 0) {
      candidates.push({
        path,
        source,
        status: "absent",
        sectionContent: null,
      });
      continue;
    }

    const startIndex = source.indexOf(markers.start);
    const endIndex = source.indexOf(markers.end);
    if (startCount !== 1 || endCount !== 1 || startIndex >= endIndex) {
      candidates.push({
        path,
        source,
        status: "conflict",
        sectionContent: null,
        reason:
          startCount > 1 || endCount > 1
            ? "duplicate-markers"
            : "malformed-markers",
      });
      continue;
    }

    candidates.push({
      path,
      source,
      status: "present",
      sectionContent: readSection(source, markers),
    });
  }

  const conflicting = candidates.find(
    (candidate) => candidate.status === "conflict",
  );
  const present = candidates.filter(
    (candidate) => candidate.status === "present",
  );
  const multipleCandidates = present.length > 1;
  const sourcePath = present.length === 1 ? (present[0]?.path ?? null) : null;
  const target =
    options.manager.target.placement === "existing-or-effective" &&
    sourcePath !== null
      ? sourcePath
      : options.manager.target.effectivePath;
  const targetState = candidates.find((candidate) =>
    samePath(candidate.path, target),
  );
  const reason =
    conflicting?.reason ??
    (multipleCandidates ? "multiple-candidates" : undefined);
  const conflict = reason !== undefined;

  return {
    markers,
    candidates,
    inspection: {
      id: selector.id ?? options.manager.owner,
      status: conflict
        ? "conflict"
        : sourcePath === null
          ? "absent"
          : "present",
      target,
      sourcePath,
      targetExists: targetState !== undefined && targetState.source !== null,
      sectionContent:
        conflict || present.length !== 1
          ? null
          : (present[0]?.sectionContent ?? null),
      ...(reason === undefined ? {} : { reason }),
    },
  };
}
