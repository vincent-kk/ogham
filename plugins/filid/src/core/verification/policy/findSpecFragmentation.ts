import { toProjectRelativePath } from '../../../lib/toProjectRelativePath.js';
import type {
  ContractGroupsByOwner,
  VerificationFileAnalysis,
  VerificationViolation,
} from '../../../types/verification.js';

/**
 * Find spec documents that share an owner without linking distinct DETAIL acceptance groups.
 * @param files Analyzed verification files; only spec documents are read.
 * @param projectRoot Absolute project root; messages name paths relative to it.
 * @param contractGroups DETAIL acceptance groups declared per owner fractal.
 * @returns Unlinked, undeclared and split contract group violations.
 */
export function findSpecFragmentation(
  files: readonly VerificationFileAnalysis[],
  projectRoot: string,
  contractGroups: ContractGroupsByOwner = new Map(),
): VerificationViolation[] {
  const shown = (path: string) => toProjectRelativePath(projectRoot, path);
  const specsByOwner = new Map<string, VerificationFileAnalysis[]>();
  for (const file of files) {
    if (file.role !== 'spec-document') continue;
    const owned = specsByOwner.get(file.ownerFractalPath) ?? [];
    owned.push(file);
    specsByOwner.set(file.ownerFractalPath, owned);
  }

  const violations: VerificationViolation[] = [];
  for (const [ownerPath, specs] of specsByOwner) {
    if (specs.length <= 1) continue;
    const availableGroups = contractGroups.get(ownerPath);
    const claimedBy = new Map<string, string>();

    for (const spec of specs) {
      if (spec.contractGroupIds.length === 0) {
        violations.push({
          ruleId: 'spec-contract-link',
          path: spec.path,
          severity: 'error',
          message: `Multiple spec documents owned by ${shown(ownerPath)} must declare at least one DETAIL acceptance group.`,
          suggestion: `Mark each spec document with a "// filid:contract <group-id>" comment naming an acceptance group declared in ${ownerPath}/DETAIL.md.`,
        });
        continue;
      }

      for (const groupId of new Set(spec.contractGroupIds)) {
        if (!availableGroups?.has(groupId))
          violations.push({
            ruleId: 'spec-contract-link',
            path: spec.path,
            severity: 'error',
            message: `Contract group "${groupId}" is not declared by ${shown(ownerPath)}/DETAIL.md.`,
            suggestion: `Declare "### ${groupId} — <title>" under "## Acceptance Criteria" in ${ownerPath}/DETAIL.md, or correct the filid:contract comment in the spec.`,
          });

        const previousPath = claimedBy.get(groupId);
        if (previousPath && previousPath !== spec.path)
          violations.push({
            ruleId: 'spec-fragmentation',
            path: spec.path,
            severity: 'error',
            message: `Contract group "${groupId}" is split across ${shown(previousPath)} and ${shown(spec.path)}.`,
            suggestion: `Keep contract group "${groupId}" in one spec document: move its cases into ${previousPath}, or split the group in ${ownerPath}/DETAIL.md.`,
          });
        else claimedBy.set(groupId, spec.path);
      }
    }
  }

  return violations;
}
