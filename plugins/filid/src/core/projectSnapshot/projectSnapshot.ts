import { pathForCompare, portableResolve } from '@ogham/cross-platform/paths';

import { resolveAdapters } from '../../adapters/index.js';
import type { AdapterRegistry } from '../../types/adapters.js';
import type {
  ProjectSnapshot,
  SnapshotDiagnostic,
} from '../../types/fractal.js';
import { buildDependencyGraph } from '../analysis/dependencyGraph/index.js';
import {
  type FilidConfig,
  resolveLanguage,
} from '../infra/configLoader/index.js';
import { scanProject } from '../tree/fractalTree/index.js';
import { analyzeVerification } from '../verification/index.js';

import { collectDependencyReferences } from './evidence/collectDependencyReferences.js';
import { collectDocumentEvidence } from './evidence/collectDocumentEvidence.js';
import { collectEntryPointSurfaces } from './evidence/collectEntryPointSurfaces.js';
import { collectLegacyCriteriaLedger } from './evidence/collectLegacyCriteriaLedger.js';
import { collectVerificationClaims } from './evidence/collectVerificationClaims.js';
import { resolveSnapshotAdapters } from './evidence/resolveSnapshotAdapters.js';
import { resolveSnapshotOwner } from './evidence/resolveSnapshotOwner.js';
import { snapshotStructureInput } from './evidence/snapshotStructureInput.js';
import { computeSnapshotHash } from './snapshotHash/computeSnapshotHash.js';

export async function createProjectSnapshot(
  projectRoot: string,
  registry: AdapterRegistry,
  config: FilidConfig,
): Promise<ProjectSnapshot> {
  const root = portableResolve(projectRoot);
  const enabledIds =
    config.adapters.mode === 'explicit' ? config.adapters.enabled : undefined;
  const selectedAdapters = await resolveSnapshotAdapters(registry, enabledIds);
  const adapterResolution = await resolveAdapters(
    root,
    selectedAdapters.structure,
  );
  const structureAdapters = adapterResolution.adapters;
  const structureOwnership = new Map(
    [...adapterResolution.ownership].map(([path, ownership]) => [
      pathForCompare(path),
      ownership.adapter.id,
    ]),
  );
  const tree = await scanProject(root, {
    maxDepth: Number.MAX_SAFE_INTEGER,
    additionalOrganNames: config.structure?.additionalOrganNames,
    structureAdapters,
    entryPointOverrides: config.structure?.entryPointOverrides,
    structureOwnership,
    enforceStructureOwnership: true,
  });
  const documents = collectDocumentEvidence(tree);
  const entryPoints = await collectEntryPointSurfaces(
    tree,
    adapterResolution.adapters,
  );
  const dependencies = await collectDependencyReferences(adapterResolution);
  const dependencyGraph = buildDependencyGraph(
    [...tree.nodes.values()]
      .filter((node) => node.type !== 'organ')
      .map((node) => node.path),
    dependencies.references,
    dependencies.certainty,
  );
  const verificationClaims = await collectVerificationClaims(
    root,
    selectedAdapters.verification,
  );
  const verificationAdapters = verificationClaims.adapters;
  const verification = await analyzeVerification({
    projectRoot: root,
    adapters: verificationAdapters,
    ownerFractalPath(filePath) {
      return resolveSnapshotOwner(tree, filePath) ?? root;
    },
    detailDocuments: documents.detailDocuments,
    discoveredPathsByAdapter: verificationClaims.discoveredPathsByAdapter,
    discoveryCertainty: verificationClaims.certainty,
  });
  const legacyCriteriaLedger = collectLegacyCriteriaLedger(root);
  const adapterDiagnostics: SnapshotDiagnostic[] =
    adapterResolution.diagnostics.map(({ code, message, path }) => ({
      code,
      message,
      ...(path ? { path } : {}),
    }));
  const diagnostics = [
    ...selectedAdapters.diagnostics,
    ...adapterDiagnostics,
    ...documents.diagnostics,
    ...entryPoints.diagnostics,
    ...dependencies.diagnostics,
    ...verificationClaims.diagnostics,
  ];
  const adapterIds = [
    ...new Set(
      [...structureAdapters, ...verificationAdapters].map(
        (adapter) => adapter.id,
      ),
    ),
  ].sort();
  const snapshotHash = computeSnapshotHash(
    root,
    [
      ...documents.filePaths,
      ...entryPoints.filePaths,
      ...dependencies.filePaths,
      ...verification.files.map((file) => file.path),
      ...(legacyCriteriaLedger ? [legacyCriteriaLedger.path] : []),
    ],
    [
      { schemaVersion: 1, config, adapterIds },
      snapshotStructureInput(tree),
      dependencyGraph,
      verification,
      diagnostics,
    ],
  );

  return {
    schemaVersion: 1,
    projectRoot: root,
    outputLanguage: resolveLanguage(config),
    snapshotHash,
    tree,
    dependencyGraph,
    adapterIds,
    verification,
    legacyCriteriaLedger,
    diagnostics,
    createdAt: new Date().toISOString(),
  };
}
