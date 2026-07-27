import { pathForCompare, portableResolve } from '@ogham/cross-platform/paths';

import type {
  VerificationFileAnalysis,
  VerificationProjectAnalysis,
  VerificationViolation,
} from '../../../../types/verification.js';

export interface VerificationEvidenceSelection {
  files: VerificationFileAnalysis[];
  violations: VerificationViolation[];
  missingPaths: string[];
}

export function selectVerificationEvidence(
  projectRoot: string,
  analysis: VerificationProjectAnalysis,
  filePaths?: string[],
): VerificationEvidenceSelection {
  if (!filePaths)
    return {
      files: analysis.files,
      violations: analysis.violations,
      missingPaths: [],
    };
  const requestedPaths = filePaths.map((path) =>
    portableResolve(projectRoot, path),
  );
  const requestedKeys = new Set(requestedPaths.map(pathForCompare));
  const files = analysis.files.filter((file) =>
    requestedKeys.has(pathForCompare(file.path)),
  );
  const violations = analysis.violations.filter((violation) =>
    requestedKeys.has(pathForCompare(violation.path)),
  );
  const knownPaths = new Set(files.map((file) => pathForCompare(file.path)));
  return {
    files,
    violations,
    missingPaths: requestedPaths.filter(
      (path) => !knownPaths.has(pathForCompare(path)),
    ),
  };
}
