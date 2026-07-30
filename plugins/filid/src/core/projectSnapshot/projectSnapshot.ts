import { pathForCompare, portableResolve } from '@ogham/cross-platform/paths';

import { resolveAdapters } from '../../adapters/index.js';
import { ALL_SNAPSHOT_AXES } from '../../constants/snapshotAxes.js';
import type { AdapterRegistry } from '../../types/adapters.js';
import type {
  ProjectSnapshot,
  SnapshotAxisSelection,
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

/** Options narrowing what a snapshot collects. */
export interface CreateProjectSnapshotOptions {
  /** Axes to collect; any axis left out is collected. */
  axes?: Partial<SnapshotAxisSelection>;
}

/**
 * Assemble one read-only evidence snapshot of a project.
 * @param projectRoot Directory the snapshot describes.
 * @param registry Adapter registry supplying ecosystem facts.
 * @param config Loaded config v2 — selects adapters and output language.
 * @param options Axis selection; omitting it collects every axis.
 * @returns The snapshot, whose `collectedAxes` reports what was gathered.
 */
export async function createProjectSnapshot(
  projectRoot: string,
  registry: AdapterRegistry,
  config: FilidConfig,
  options: CreateProjectSnapshotOptions = {},
): Promise<ProjectSnapshot> {
  const axes: SnapshotAxisSelection = { ...ALL_SNAPSHOT_AXES, ...options.axes };
  const root = portableResolve(projectRoot);
  const enabledIds =
    config.adapters.mode === 'explicit' ? config.adapters.enabled : undefined;
  const selectedAdapters = await resolveSnapshotAdapters(registry, enabledIds);
  const additionalExcludedDirectories =
    config.structure?.additionalExcludedDirectories;
  const adapterResolution = await resolveAdapters(
    root,
    selectedAdapters.structure,
    { excludedDirectoryNames: additionalExcludedDirectories },
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
    additionalExcludedDirectories,
    structureAdapters,
    entryPointOverrides: config.structure?.entryPointOverrides,
    structureOwnership,
    enforceStructureOwnership: true,
  });
  const documents = collectDocumentEvidence(tree);
  const entryPoints = axes.entrySurfaces
    ? await collectEntryPointSurfaces(tree, adapterResolution.adapters)
    : { diagnostics: [], filePaths: [] };
  const dependencies = axes.dependencies
    ? await collectDependencyReferences(adapterResolution)
    : {
        certainty: 'unsupported' as const,
        diagnostics: [],
        filePaths: [],
        references: [],
      };
  const verificationClaims = axes.verification
    ? await collectVerificationClaims(root, selectedAdapters.verification)
    : {
        adapters: [],
        diagnostics: [],
        discoveredPathsByAdapter: new Map<string, readonly string[]>(),
        certainty: 'unsupported' as const,
      };
  const verificationAdapters = verificationClaims.adapters;
  // Verification is resolved before the graph: its file list decides which
  // references leave the cycle adjacency. It reads the tree and documents only,
  // so nothing here depends on the graph.
  const verification = axes.verification
    ? await analyzeVerification({
        projectRoot: root,
        adapters: verificationAdapters,
        ownerFractalPath(filePath) {
          return resolveSnapshotOwner(tree, filePath) ?? root;
        },
        detailDocuments: documents.detailDocuments,
        discoveredPathsByAdapter: verificationClaims.discoveredPathsByAdapter,
        discoveryCertainty: verificationClaims.certainty,
      })
    : { files: [], violations: [], certainty: 'unsupported' as const };
  const dependencyGraph = axes.dependencies
    ? buildDependencyGraph(
        [...tree.nodes.values()]
          .filter((node) => node.type !== 'organ')
          .map((node) => node.path),
        dependencies.references,
        dependencies.certainty,
        {
          organPaths: [...tree.nodes.values()]
            .filter((node) => node.type === 'organ')
            .map((node) => node.path),
          verificationPaths: verification.files.map((file) => file.path),
        },
      )
    : {
        nodePaths: [],
        edges: [],
        cycles: [],
        certainty: 'unsupported' as const,
      };
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
  const isEveryAxis =
    axes.entrySurfaces && axes.dependencies && axes.verification;
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
      // A full-axis snapshot keeps the hash it had before axes existed; only a
      // narrowed one adds the selection, so the two cannot collide.
      ...(isEveryAxis ? [] : [axes]),
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
    collectedAxes: axes,
    createdAt: new Date().toISOString(),
  };
}
