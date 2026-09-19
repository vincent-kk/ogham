import { samePath } from '@ogham/cross-platform';

import { RESTRUCTURE_VALIDATION_CODES } from '../../../constants/restructure.js';
import type { ProjectSnapshot } from '../../../types/fractal.js';
import type {
  ImportRewrite,
  MoveInstruction,
  PlanValidationFinding,
} from '../../../types/restructure.js';
import { specifierDenotesDirectoryOf } from '../specifiers/specifierDenotesDirectoryOf.js';
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
        (specifierDenotesPath(
          evidence.sourceFile,
          evidence.rawSpecifier,
          evidence.resolvedPath,
        ) ||
          specifierDenotesDirectoryOf(
            evidence.sourceFile,
            evidence.rawSpecifier,
            evidence.resolvedPath,
          ) !== null),
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
            message: `${rewrite.consumerPath} has no import "${rewrite.requiredSpecifier}".`,
            nextAction: `In ${rewrite.consumerPath}, replace the import "${rewrite.currentSpecifier}" with "${rewrite.requiredSpecifier}", then run postcondition again.`,
            path: rewrite.consumerPath,
            sourcePath: move.sourcePath,
          },
        ],
  );
}
