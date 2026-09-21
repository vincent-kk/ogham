import { pathForCompare, portableResolve } from '@ogham/cross-platform';

import { resolveAdapters } from '../../adapters/index.js';
import { ANALYSIS_AXES } from '../../constants/analysisAxes.js';
import { DEPENDENCY_DIAGNOSTIC_CODES } from '../../constants/dependencyDiagnosticCodes.js';
import { ALL_SNAPSHOT_AXES } from '../../constants/snapshotAxes.js';
import type { AdapterRegistry } from '../../types/adapters.js';
import type {
  ProjectSnapshot,
  SnapshotAxisSelection,
  SnapshotDiagnostic,
} from '../../types/fractal.js';
import {
  buildDependencyGraph,
  findUnownedReferences,
} from '../analysis/dependencyGraph/index.js';
import type { VerificationFileFacts } from '../../types/verification.js';
import { classifyProjectFacts, readProjectFacts } from '../facts/index.js';
import type { FactsFileState, ProjectFacts } from '../facts/index.js';
import {
  type FilidConfig,
  resolveLanguage,
} from '../infra/configLoader/index.js';
import { scanFileSetOptions, scanProject } from '../tree/fractalTree/index.js';
import { analyzeVerification } from '../verification/index.js';

import { collectDependencyReferences } from './evidence/collectDependencyReferences.js';
import { normalizeFactsEvidence } from './evidence/normalizeFactsEvidence.js';
import { collectDocumentEvidence } from './evidence/collectDocumentEvidence.js';
import { collectEntryPointSurfaces } from './evidence/collectEntryPointSurfaces.js';
import { collectLegacyCriteriaLedger } from './evidence/collectLegacyCriteriaLedger.js';
import { collectVerificationClaims } from './evidence/collectVerificationClaims.js';
import { resolveSnapshotAdapters } from './evidence/resolveSnapshotAdapters.js';
import { resolveSnapshotOwner } from './evidence/resolveSnapshotOwner.js';
import { snapshotStructureInput } from './evidence/snapshotStructureInput.js';
import { createDependencyDiagnostic } from './evidence/utils/createDependencyDiagnostic.js';
import { computeSnapshotHash } from './snapshotHash/computeSnapshotHash.js';
import { omitUnknownFiles } from './snapshotHash/omitUnknownFiles.js';

/** Options narrowing what a snapshot collects. */
export interface CreateProjectSnapshotOptions {
  /** Axes to collect; any axis left out is collected. */
  axes?: Partial<SnapshotAxisSelection>;
}

/**
 * How many bytes of already-read source one snapshot holds for its hash.
 *
 * Past this the remaining files are read again by `computeSnapshotHash`, which
 * costs time and changes no answer — the point of the cap is that a project
 * large enough to matter cannot make one snapshot hold its whole source.
 */
const SNAPSHOT_HASH_BYTE_BUDGET = 64 * 1024 * 1024;

/**
 * Read the facts store once and classify every scanned file from that read.
 * @param root Absolute project root, already resolved.
 * @param config The configuration this snapshot is being built with.
 * @returns The store contents, each scanned file's state (spec §3), and the
 * bytes the classification read, for the snapshot hash to reuse.
 */
async function readSnapshotFacts(
  root: string,
  config: FilidConfig,
): Promise<{
  facts: ProjectFacts;
  states: Map<string, FactsFileState>;
  bytes: Map<string, Uint8Array>;
}> {
  const facts = await readProjectFacts(root, config);
  const collect = {
    bytes: new Map<string, Uint8Array>(),
    maxTotalBytes: SNAPSHOT_HASH_BYTE_BUDGET,
  };
  return {
    facts,
    states: classifyProjectFacts(root, facts, collect),
    bytes: collect.bytes,
  };
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
    ...scanFileSetOptions(config),
    additionalOrganNames: config.structure?.additionalOrganNames,
    structureAdapters,
    entryPointOverrides: config.structure?.entryPointOverrides,
    structureOwnership,
    enforceStructureOwnership: true,
  });
  const documents = collectDocumentEvidence(tree);
  // One read of the store per snapshot: two reads could classify one file two
  // ways, and the three axes would then disagree about what the project is.
  const stored =
    axes.entrySurfaces || axes.dependencies || axes.verification
      ? await readSnapshotFacts(root, config)
      : null;
  const entryPoints =
    axes.entrySurfaces && stored
      ? await collectEntryPointSurfaces(
          tree,
          adapterResolution.adapters,
          stored.facts,
          stored.states,
        )
      : { diagnostics: [], filePaths: [] };
  const dependencies =
    axes.dependencies && stored
      ? await collectDependencyReferences(
          adapterResolution,
          root,
          stored.facts,
          stored.states,
        )
      : {
          certainty: 'unsupported' as const,
          diagnostics: [],
          filePaths: [],
          references: [],
          adjudications: [],
          unknownFiles: [],
          normalizedFacts: [],
    filesOutsideFactsScope: 0,
        };
  const verificationClaims =
    axes.verification && stored
      ? await collectVerificationClaims(
          root,
          selectedAdapters.verification,
          stored.facts,
          stored.states,
        )
      : {
          adapters: [],
          diagnostics: [],
          discoveredPathsByAdapter: new Map<string, readonly string[]>(),
          verificationFacts: new Map<string, VerificationFileFacts>(),
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
        verificationFacts: verificationClaims.verificationFacts,
      })
    : { files: [], violations: [], certainty: 'unsupported' as const };
  const ownerNodePaths = [...tree.nodes.values()]
    .filter((node) => node.type !== 'organ')
    .map((node) => node.path);
  const verificationFilePaths = verification.files.map((file) => file.path);
  const dependencyGraph = axes.dependencies
    ? buildDependencyGraph(
        ownerNodePaths,
        dependencies.references,
        dependencies.certainty,
        {
          projectRoot: root,
          unknownFiles: dependencies.unknownFiles,
          organPaths: [...tree.nodes.values()]
            .filter((node) => node.type === 'organ')
            .map((node) => node.path),
          verificationPaths: verificationFilePaths,
        },
      )
    : {
        nodePaths: [],
        edges: [],
        cycles: [],
        unknownFiles: [],
        certainty: 'unsupported' as const,
      };
  const unownedDependencyDiagnostics = axes.dependencies
    ? findUnownedReferences(ownerNodePaths, dependencies.references, {
        verificationPaths: verificationFilePaths,
      }).map(({ reference, unownedPath }) =>
        createDependencyDiagnostic(
          DEPENDENCY_DIAGNOSTIC_CODES.UNOWNED,
          `${reference.rawSpecifier} in ${reference.sourceFile} resolves to ${reference.resolvedPath}, but no fractal owns ${unownedPath}, so the reference cannot enter the dependency graph.`,
          `With the user's agreement, make a fractal own ${unownedPath} — an INTENT.md in its directory or an ancestor does that — or move the file under an existing fractal; until then no rule can see this reference. Report it as a finding and carry on: the rest of the graph is judged without it.`,
          root,
          reference.sourceFile,
          reference.rawSpecifier,
        ),
      )
    : [];
  const legacyCriteriaLedger = collectLegacyCriteriaLedger(root);
  const adapterDiagnostics: SnapshotDiagnostic[] =
    adapterResolution.diagnostics.map(
      ({ code, message, path, nextAction }) => ({
        code,
        message,
        affects: ANALYSIS_AXES,
        nextAction,
        ...(path ? { path } : {}),
      }),
    );
  const diagnostics = [
    ...selectedAdapters.diagnostics,
    ...adapterDiagnostics,
    ...documents.diagnostics,
    ...entryPoints.diagnostics,
    ...dependencies.diagnostics,
    ...unownedDependencyDiagnostics,
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
      // `unknownFiles` is left out: the diagnostics below already decide it.
      omitUnknownFiles(dependencyGraph),
      verification,
      diagnostics,
      // A full-axis snapshot keeps the hash it had before axes existed; only a
      // narrowed one adds the selection, so the two cannot collide.
      ...(isEveryAxis ? [] : [axes]),
    ],
    stored?.bytes,
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
    normalizedFacts: normalizeFactsEvidence(
      root,
      dependencies.references,
      dependencies.adjudications,
      stored?.states ?? new Map(),
    ),
    filesOutsideFactsScope: dependencies.filesOutsideFactsScope,
    collectedAxes: axes,
    createdAt: new Date().toISOString(),
  };
}
