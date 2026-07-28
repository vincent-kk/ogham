import { samePath } from '@ogham/cross-platform/paths';

import {
  RESTRUCTURE_VALIDATION_CODES,
  RESTRUCTURE_VALIDATION_MESSAGES,
} from '../../../constants/restructure.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  ImportRewrite,
  MoveInstruction,
  PlanValidationFinding,
} from '../../../types/restructure.js';
import { specifierDenotesPath } from '../specifiers/specifierDenotesPath.js';

function hasRewriteEvidence(
  snapshot: ProjectSnapshot,
  rewrite: ImportRewrite,
): boolean {
  return snapshot.dependencyGraph.edges.some((edge) =>
    edge.evidence.some(
      (evidence) =>
        samePath(evidence.sourceFile, rewrite.consumerPath) &&
        evidence.rawSpecifier === rewrite.requiredSpecifier &&
        specifierDenotesPath(
          evidence.sourceFile,
          evidence.rawSpecifier,
          evidence.resolvedPath,
        ),
    ),
  );
}

export function validateImportRewrites(
  snapshot: ProjectSnapshot,
  move: MoveInstruction,
): PlanValidationFinding[] {
  return move.affectedImports.flatMap((rewrite) =>
    hasRewriteEvidence(snapshot, rewrite)
      ? []
      : [
          {
            code: RESTRUCTURE_VALIDATION_CODES.IMPORT_REWRITE_MISSING,
            message: RESTRUCTURE_VALIDATION_MESSAGES.IMPORT_REWRITE_MISSING,
            path: rewrite.consumerPath,
            sourcePath: move.sourcePath,
          },
        ],
  );
}
