import type {
  AdapterClaim,
  AdapterRegistry,
  StructureAdapter,
  VerificationAdapter,
} from '../../types/adapters.js';
import {
  ECMASCRIPT_ADAPTER_ID,
  ecmascriptStructureAdapter,
  ecmascriptVerificationAdapter,
} from '../ecmascript/index.js';

export interface InitialAdapters {
  structure?: readonly StructureAdapter[];
  verification?: readonly VerificationAdapter[];
}

async function resolveDetected<
  T extends { id: string; detect(root: string): Promise<AdapterClaim> },
>(
  root: string,
  adapters: Iterable<T>,
  enabledIds?: readonly string[],
): Promise<T[]> {
  const available = new Map(
    [...adapters].map((adapter) => [adapter.id, adapter]),
  );
  const selectedIds = enabledIds ?? [...available.keys()];
  const unknown = selectedIds.filter((id) => !available.has(id));
  if (unknown.length > 0)
    throw new Error(`unknown-adapter-id: ${unknown.join(', ')}`);

  const claims = await Promise.all(
    selectedIds.map(async (id) => {
      const adapter = available.get(id)!;
      return { adapter, claim: await adapter.detect(root) };
    }),
  );
  return claims
    .filter(({ claim }) => claim.confidence > 0)
    .sort(
      (left, right) =>
        right.claim.confidence - left.claim.confidence ||
        left.adapter.id.localeCompare(right.adapter.id),
    )
    .map(({ adapter }) => adapter);
}

export function createAdapterRegistry(
  initial?: InitialAdapters,
): AdapterRegistry {
  const structure = new Map<string, StructureAdapter>();
  const verification = new Map<string, VerificationAdapter>();

  const register = <T extends { id: string }>(
    target: Map<string, T>,
    adapter: T,
  ): void => {
    if (target.has(adapter.id))
      throw new Error(`Adapter ID already registered: ${adapter.id}`);
    target.set(adapter.id, adapter);
  };

  const defaults = initial === undefined;
  for (const adapter of initial?.structure ??
    (defaults ? [ecmascriptStructureAdapter] : []))
    register(structure, adapter);
  for (const adapter of initial?.verification ??
    (defaults ? [ecmascriptVerificationAdapter] : []))
    register(verification, adapter);

  return {
    registerStructure(adapter) {
      register(structure, adapter);
    },
    registerVerification(adapter) {
      register(verification, adapter);
    },
    resolveStructure(root, enabledIds) {
      return resolveDetected(root, structure.values(), enabledIds);
    },
    resolveVerification(root, enabledIds) {
      return resolveDetected(root, verification.values(), enabledIds);
    },
    structureIds() {
      return [...structure.keys()].sort();
    },
    verificationIds() {
      return [...verification.keys()].sort();
    },
  };
}

export function getDefaultAdapterIds(): string[] {
  return [ECMASCRIPT_ADAPTER_ID];
}
