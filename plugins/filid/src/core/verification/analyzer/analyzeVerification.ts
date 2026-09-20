import { pathForCompare, portableResolve } from '@ogham/cross-platform';

import type {
  AnalyzeVerificationInput,
  VerificationFileAnalysis,
  VerificationProjectAnalysis,
} from '../../../types/verification.js';
import { resolveContractGroups } from '../contracts/resolveContractGroups.js';
import { evaluateVerificationPolicy } from '../policy/evaluateVerificationPolicy.js';

/**
 * Judge the discovered verification files against the per-file policy.
 *
 * Discovery says which files are verification; the records say what each one
 * is and how many cases it holds. A discovered file with no record is left out
 * of the analysis rather than guessed at — the caller carries that gap as a
 * diagnostic and as `discoveryCertainty`, so it cannot become an empty pass.
 * @param input Project root, adapters, the discovered paths, the records'
 * verification facts, the owner lookup and the DETAIL contract documents.
 * @returns Every judged file, the policy violations and the aggregate
 * certainty, never raised above the discovery certainty the caller supplied.
 */
export async function analyzeVerification(
  input: AnalyzeVerificationInput,
): Promise<VerificationProjectAnalysis> {
  const files: VerificationFileAnalysis[] = [];
  const claimedPaths = new Set<string>();

  for (const adapter of input.adapters) {
    const supplied = input.discoveredPathsByAdapter;
    const rawPaths = supplied
      ? (supplied.get(adapter.id) ?? [])
      : await adapter.discover(input.projectRoot);
    const discovered = [
      ...new Map(
        rawPaths.map((path) => {
          const absolutePath = portableResolve(input.projectRoot, path);
          return [pathForCompare(absolutePath), absolutePath] as const;
        }),
      ).values(),
    ].sort((left, right) =>
      pathForCompare(left).localeCompare(pathForCompare(right)),
    );
    for (const path of discovered) {
      const key = pathForCompare(path);
      if (claimedPaths.has(key)) continue;
      // No record, no judgement: the caller reports that gap as a diagnostic
      // and lowers this analysis's certainty through `discoveryCertainty`.
      const facts = input.verificationFacts.get(key);
      if (facts === undefined || facts.role === 'unsupported') continue;
      claimedPaths.add(key);
      files.push({
        path,
        adapterId: adapter.id,
        role: facts.role,
        count: facts.cases,
        ownerFractalPath: input.ownerFractalPath(path),
        contractGroupIds: await adapter.extractContractGroupIds(path),
      });
    }
  }

  const analysis = evaluateVerificationPolicy(
    files,
    input.projectRoot,
    resolveContractGroups(input.detailDocuments ?? []),
  );
  return analysis.certainty === 'exact' && input.discoveryCertainty
    ? { ...analysis, certainty: input.discoveryCertainty }
    : analysis;
}
