import { portableResolve } from '@ogham/cross-platform';

import { toProjectRelativePath } from '../../../lib/toProjectRelativePath.js';
import type {
  ProjectSnapshot,
  UnknownFilePartition,
} from '../../../types/fractal.js';
import {
  type RelevanceTarget,
  partitionUnknownFiles,
} from '../../analysis/dependencyGraph/index.js';

/** The partition plus the files whose text the filter read. */
export interface PlanUnknownFiles extends UnknownFilePartition {
  /** Absolute paths of the unknown files the filter read successfully, in read order. */
  readPaths: string[];
}

/**
 * Split a snapshot's unknown files by relevance to a plan's units.
 * @param snapshot Snapshot whose graph lists the unknown files.
 * @param targets Units under judgement, with absolute paths.
 * @param consumerPaths Absolute consumer paths the plan requires imports of; related whatever their text.
 * @param readText Text of a project-relative file, or null when it cannot be read.
 * @returns Relevant and other files, and the absolute paths of the files read.
 */
export function partitionPlanUnknownFiles(
  snapshot: ProjectSnapshot,
  targets: readonly RelevanceTarget[],
  consumerPaths: readonly string[],
  readText: (relativePath: string) => string | null,
): PlanUnknownFiles {
  const root = snapshot.projectRoot;
  const readPaths: string[] = [];
  const partition = partitionUnknownFiles(
    snapshot.dependencyGraph.unknownFiles,
    targets.map(({ path, kind }) => ({
      path: toProjectRelativePath(root, path),
      kind,
    })),
    (relativePath) => {
      const text = readText(relativePath);
      if (text !== null) readPaths.push(portableResolve(root, relativePath));
      return text;
    },
    consumerPaths.map((path) => toProjectRelativePath(root, path)),
  );
  return { ...partition, readPaths };
}
