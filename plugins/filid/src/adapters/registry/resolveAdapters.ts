import { resolve } from 'node:path';

import type {
  AdapterClaim,
  AdapterDiagnostic,
  AdapterOwnership,
  AdapterResolution,
  StructureAdapter,
} from '../../types/adapters.js';

interface ClaimedAdapter {
  adapter: StructureAdapter;
  claim: AdapterClaim;
  files: Set<string>;
}

export async function resolveAdapters(
  projectRoot: string,
  adapters: readonly StructureAdapter[],
  requestedPaths?: readonly string[],
): Promise<AdapterResolution> {
  const detected = await Promise.all(
    adapters.map(async (adapter) => ({
      adapter,
      claim: await adapter.detect(projectRoot),
    })),
  );
  const active = detected
    .filter(({ claim }) => claim.confidence > 0)
    .sort(
      (left, right) =>
        right.claim.confidence - left.claim.confidence ||
        left.adapter.id.localeCompare(right.adapter.id),
    );
  const claimed: ClaimedAdapter[] = await Promise.all(
    active.map(async ({ adapter, claim }) => ({
      adapter,
      claim,
      files: new Set(
        (await adapter.discoverSourceFiles(projectRoot)).map((path) =>
          resolve(path),
        ),
      ),
    })),
  );
  const paths = [
    ...new Set(
      (requestedPaths ?? claimed.flatMap(({ files }) => [...files])).map(
        (path) => resolve(path),
      ),
    ),
  ].sort();
  const ownership = new Map<string, AdapterOwnership>();
  const unsupportedPaths: string[] = [];
  const diagnostics: AdapterDiagnostic[] = [];

  for (const path of paths) {
    const candidates = claimed.filter(({ files }) => files.has(path));
    if (candidates.length === 0) {
      unsupportedPaths.push(path);
      diagnostics.push({
        code: 'unsupported',
        path,
        message: `No registered adapter owns ${path}`,
      });
      continue;
    }

    const highestConfidence = Math.max(
      ...candidates.map(({ claim }) => claim.confidence),
    );
    const highest = candidates.filter(
      ({ claim }) => claim.confidence === highestConfidence,
    );
    if (highest.length > 1) {
      const adapterIds = highest
        .map(({ adapter }) => adapter.id)
        .sort((left, right) => left.localeCompare(right));
      diagnostics.push({
        code: 'ambiguous-adapter-claim',
        path,
        adapterIds,
        message: `Equal-confidence adapters claim ${path}: ${adapterIds.join(', ')}`,
      });
      continue;
    }

    const [{ adapter, claim }] = highest;
    ownership.set(path, { adapter, claim });
  }

  return {
    adapters: active.map(({ adapter }) => adapter),
    claims: new Map(active.map(({ adapter, claim }) => [adapter.id, claim])),
    ownership,
    unsupportedPaths,
    diagnostics,
  };
}
