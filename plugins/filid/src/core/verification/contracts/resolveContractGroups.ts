import type {
  ContractGroupsByOwner,
  DetailContractDocument,
} from '../../../types/verification.js';
import { validateDetailAcceptanceGroups } from '../../rules/documentValidator/index.js';

export function resolveContractGroups(
  documents: readonly DetailContractDocument[],
): ContractGroupsByOwner {
  const groups = new Map<string, Set<string>>();
  for (const document of documents) {
    const ownerGroups =
      groups.get(document.ownerFractalPath) ?? new Set<string>();
    const validation = validateDetailAcceptanceGroups(document.content);
    for (const group of validation.groups) ownerGroups.add(group.id);
    groups.set(document.ownerFractalPath, ownerGroups);
  }
  return groups;
}
