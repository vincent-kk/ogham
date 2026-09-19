import type {
  ContractGroupsByOwner,
  VerificationFileAnalysis,
  VerificationViolation,
} from '../../../types/verification.js';

export function findSpecFragmentation(
  files: readonly VerificationFileAnalysis[],
  contractGroups: ContractGroupsByOwner = new Map(),
): VerificationViolation[] {
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
          message: `Multiple spec documents owned by ${ownerPath} must declare at least one DETAIL acceptance group.`,
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
            message: `Contract group "${groupId}" is not declared by ${ownerPath}/DETAIL.md.`,
            suggestion: `Declare "### ${groupId} — <title>" under "## Acceptance Criteria" in ${ownerPath}/DETAIL.md, or correct the filid:contract comment in the spec.`,
          });

        const previousPath = claimedBy.get(groupId);
        if (previousPath && previousPath !== spec.path)
          violations.push({
            ruleId: 'spec-fragmentation',
            path: spec.path,
            severity: 'error',
            message: `Contract group "${groupId}" is split across ${previousPath} and ${spec.path}.`,
            suggestion: `Keep contract group "${groupId}" in one spec document: move its cases into ${previousPath}, or split the group in ${ownerPath}/DETAIL.md.`,
          });
        else claimedBy.set(groupId, spec.path);
      }
    }
  }

  return violations;
}
