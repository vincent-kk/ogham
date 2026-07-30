import { pathForCompare, portableResolve } from '@ogham/cross-platform';

import type {
  AnalyzeVerificationInput,
  VerificationFileAnalysis,
  VerificationProjectAnalysis,
} from '../../../types/verification.js';
import { resolveContractGroups } from '../contracts/resolveContractGroups.js';
import { evaluateVerificationPolicy } from '../policy/evaluateVerificationPolicy.js';

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
      const role = await adapter.classify(path);
      if (role === 'unsupported') continue;
      claimedPaths.add(key);
      files.push({
        path,
        adapterId: adapter.id,
        role,
        count: await adapter.count(path),
        ownerFractalPath: input.ownerFractalPath(path),
        contractGroupIds: await adapter.extractContractGroupIds(path),
      });
    }
  }

  const analysis = evaluateVerificationPolicy(
    files,
    resolveContractGroups(input.detailDocuments ?? []),
  );
  return analysis.certainty === 'exact' && input.discoveryCertainty
    ? { ...analysis, certainty: input.discoveryCertainty }
    : analysis;
}
