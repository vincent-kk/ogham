import { pathForCompare, portableResolve } from '@ogham/cross-platform/paths';

import type { VerificationAdapter } from '../../../types/adapters.js';
import type {
  AnalysisCertainty,
  SnapshotDiagnostic,
} from '../../../types/fractal.js';

interface VerificationClaim {
  adapterId: string;
  confidence: number;
  path: string;
}

export interface CollectedVerificationClaims {
  adapters: VerificationAdapter[];
  diagnostics: SnapshotDiagnostic[];
  discoveredPathsByAdapter: ReadonlyMap<string, readonly string[]>;
  certainty: AnalysisCertainty;
}

export async function collectVerificationClaims(
  projectRoot: string,
  adapters: readonly VerificationAdapter[],
): Promise<CollectedVerificationClaims> {
  const claims = new Map<string, VerificationClaim[]>();
  const diagnostics: SnapshotDiagnostic[] = [];
  const activeAdapters: VerificationAdapter[] = [];
  const discoveredPathsByAdapter = new Map<string, string[]>();
  let certainty: AnalysisCertainty = 'exact';

  for (const adapter of adapters)
    try {
      const claim = await adapter.detect(projectRoot);
      if (claim.confidence <= 0) continue;
      activeAdapters.push(adapter);
      discoveredPathsByAdapter.set(adapter.id, []);
      const discovered = new Map<string, string>();
      for (const path of await adapter.discover(projectRoot)) {
        const absolutePath = portableResolve(projectRoot, path);
        discovered.set(pathForCompare(absolutePath), absolutePath);
      }
      for (const [key, path] of discovered)
        claims.set(key, [
          ...(claims.get(key) ?? []),
          { adapterId: adapter.id, confidence: claim.confidence, path },
        ]);
    } catch (error) {
      certainty = 'indeterminate';
      diagnostics.push({
        code: 'verification-discovery-failed',
        message: error instanceof Error ? error.message : String(error),
      });
    }

  if (activeAdapters.length === 0 && certainty === 'exact')
    certainty = 'unsupported';
  for (const pathClaims of claims.values()) {
    const highestConfidence = Math.max(
      ...pathClaims.map((claim) => claim.confidence),
    );
    const highest = pathClaims.filter(
      (claim) => claim.confidence === highestConfidence,
    );
    const adapterIds = [
      ...new Set(highest.map((claim) => claim.adapterId)),
    ].sort((left, right) => left.localeCompare(right));
    const path = highest[0].path;
    if (adapterIds.length > 1) {
      certainty = 'indeterminate';
      diagnostics.push({
        code: 'ambiguous-adapter-claim',
        message: `Equal-confidence verification adapters claim ${path}: ${adapterIds.join(', ')}.`,
        path,
      });
      continue;
    }
    discoveredPathsByAdapter.get(adapterIds[0])?.push(path);
  }

  for (const paths of discoveredPathsByAdapter.values())
    paths.sort((left, right) =>
      pathForCompare(left).localeCompare(pathForCompare(right)),
    );
  return {
    adapters: activeAdapters,
    diagnostics,
    discoveredPathsByAdapter,
    certainty,
  };
}
