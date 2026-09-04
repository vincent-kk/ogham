import { pathForCompare, portableResolve } from '@ogham/cross-platform';

import type {
  VerificationFileAnalysis,
  VerificationProjectAnalysis,
  VerificationViolation,
} from '../../../types/verification.js';

/** Verification analyses and unresolved requested paths selected for one scan. */
export interface VerificationEvidenceSelection {
  /** Verification files that match the requested scope. */
  files: VerificationFileAnalysis[];
  /** Verification violations that match the requested scope. */
  violations: VerificationViolation[];
  /** Requested paths that have no verification analysis. */
  missingPaths: string[];
}

/**
 * Select verification evidence for an optional path list.
 * @param projectRoot Absolute root used to resolve requested paths.
 * @param analysis Project verification analysis to filter.
 * @param filePaths Optional project-relative or absolute paths to retain.
 * @returns Matching verification files and violations plus unresolved paths.
 */
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
