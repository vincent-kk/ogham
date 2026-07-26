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
    const discovered = [...(await adapter.discover(input.projectRoot))].sort();
    for (const path of discovered) {
      if (claimedPaths.has(path)) continue;
      const role = await adapter.classify(path);
      if (role === 'unsupported') continue;
      claimedPaths.add(path);
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

  return evaluateVerificationPolicy(
    files,
    resolveContractGroups(input.detailDocuments ?? []),
  );
}
