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
          });

        const previousPath = claimedBy.get(groupId);
        if (previousPath && previousPath !== spec.path)
          violations.push({
            ruleId: 'spec-fragmentation',
            path: spec.path,
            severity: 'error',
            message: `Contract group "${groupId}" is split across ${previousPath} and ${spec.path}.`,
          });
        else claimedBy.set(groupId, spec.path);
      }
    }
  }

  return violations;
}
