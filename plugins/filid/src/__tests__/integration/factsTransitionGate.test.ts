/**
 * Transition gate G11: the store and the adapters reach the same conclusions.
 *
 * Deleted in S4 together with the adapter read path this file compares against.
 * Until then it is the evidence that moving the three axes onto the facts store
 * changed no answer: the reference sets agree file by file, and the graph, the
 * cycles and the rule results built from each source agree too. A difference
 * that is intended belongs in `DECLARED_DIFFERENCES`, with its reason, and
 * anything outside that list fails the gate.
 *
 * Set `FILID_GATE_OUT` to an absolute path to have the run write its counts
 * there; `evidence/s3c-transition-gate.md` is transcribed from that file.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { pathForCompare } from '@ogham/cross-platform';
import { afterAll, describe, expect, it } from 'vitest';

import {
  createAdapterRegistry,
  ecmascriptStructureAdapter,
  resolveAdapters,
} from '../../adapters/index.js';
import { FACTS_UNKNOWN_CAUSES } from '../../constants/facts.js';
import {
  buildDependencyGraph,
  createDefaultConfig,
  createProjectSnapshot,
  getActiveRules,
  loadBuiltinRules,
  loadConfig,
  resolveMaxDepth,
  validateStructure,
} from '../../core/index.js';
import { toProjectRelativePath } from '../../lib/toProjectRelativePath.js';
import type { DependencyReference } from '../../types/adapters.js';
import type { DependencyGraph, ProjectSnapshot } from '../../types/fractal.js';

import { createFixtureProjectRoot } from './helpers/createFixtureProjectRoot.js';
import { seedFacts } from './helpers/seedFacts.js';

/**
 * Files whose two sources are expected to disagree, with the reason.
 *
 * Project-relative path to the reason the difference is intended. An empty
 * list is the gate passing at its strictest.
 */
const DECLARED_DIFFERENCES: Readonly<Record<string, string>> = {
  'src/__tests__/unit/factsExtractor/extractorBundleGuard.test.ts':
    'references: its import of scripts/factsExtractorBundle.mjs resolves inside the root but to a file the scan does not cover, so validateReferences downgrades the stored resolution to external (spec §4.3) while the raw adapter reports the path. The server rule owns this difference; neither provider is wrong, and no edge can exist either way because the target is not a node.',
};

/** This plugin, the largest input the gate runs over. */
const REPOSITORY_ROOT = join(import.meta.dirname, '..', '..', '..');

/** Counts the run collects, written out when `FILID_GATE_OUT` is set. */
const measured: Record<string, unknown> = {};

const temporaryRoots: string[] = [];

afterAll(() => {
  for (const root of temporaryRoots)
    rmSync(root, { recursive: true, force: true });
  const out = process.env.FILID_GATE_OUT;
  if (out) writeFileSync(out, JSON.stringify(measured, null, 2));
});

/**
 * Every in-project reference the adapters report for the files they own.
 * @param projectRoot Absolute project root.
 * @returns References in the shape the graph builder consumes.
 */
async function adapterReferences(
  projectRoot: string,
): Promise<DependencyReference[]> {
  const resolution = await resolveAdapters(projectRoot, [
    ecmascriptStructureAdapter,
  ]);
  const collected: DependencyReference[] = [];
  for (const [filePath, ownership] of resolution.ownership)
    collected.push(
      ...(await ownership.adapter.extractDependencies(filePath)).filter(
        (reference) =>
          reference.resolvedPath === null ||
          pathForCompare(reference.resolvedPath).startsWith(
            `${pathForCompare(projectRoot)}/`,
          ),
      ),
    );
  return collected;
}

/**
 * The same graph the snapshot builds, from a reference list of the caller's.
 * @param snapshot Snapshot supplying the tree, the owners and the unknown files.
 * @param references References to build the graph from.
 * @returns The graph those references produce.
 */
function graphFrom(
  snapshot: ProjectSnapshot,
  references: readonly DependencyReference[],
): DependencyGraph {
  const nodes = [...snapshot.tree.nodes.values()];
  // Only the unknown files the store had no part in — adapter ownership and
  // unfollowed links. Handing the adapter graph the facts-derived ones would
  // make its set a superset of the other by construction, and "the store calls
  // this file unknown and the adapter does not" could never show.
  const factsCauses = new Set<string>(Object.values(FACTS_UNKNOWN_CAUSES));
  return buildDependencyGraph(
    nodes.filter((node) => node.type !== 'organ').map((node) => node.path),
    references,
    'exact',
    {
      projectRoot: snapshot.projectRoot,
      unknownFiles: snapshot.dependencyGraph.unknownFiles.filter(({ causes }) =>
        causes.some((cause) => !factsCauses.has(cause)),
      ),
      organPaths: nodes
        .filter((node) => node.type === 'organ')
        .map((node) => node.path),
      verificationPaths: snapshot.verification.files.map((file) => file.path),
    },
  );
}

/**
 * What a reader of the graph concludes: cycles, unknown files, rule results.
 * @param snapshot Snapshot to judge.
 * @param graph Graph to judge it with, replacing the snapshot's own.
 * @param rules Active rules, as the tool resolves them.
 * @param maxDepth Structural depth limit, as the tool resolves it.
 * @returns Comparable strings, sorted, so two sources diff as sets.
 */
function conclusionsOf(
  snapshot: ProjectSnapshot,
  graph: DependencyGraph,
  rules: Parameters<typeof validateStructure>[1],
  maxDepth: number,
): { cycles: string[]; unknownFiles: string[]; violations: string[] } {
  const report = validateStructure(
    { ...snapshot, dependencyGraph: graph },
    rules,
    {
      maxDepth,
    },
  );
  return {
    cycles: graph.cycles
      .map((cycle) =>
        cycle
          .map((path) => toProjectRelativePath(snapshot.projectRoot, path))
          .join(' -> '),
      )
      .sort(),
    unknownFiles: graph.unknownFiles.map(({ path }) => path).sort(),
    violations: report.result.violations
      .map(
        (violation) =>
          `${violation.ruleId} ${toProjectRelativePath(snapshot.projectRoot, violation.path)}`,
      )
      .sort(),
  };
}

/**
 * Run both comparisons over one project and return what differed.
 * @param projectRoot Absolute root of a project whose facts are already seeded.
 * @param label Key the counts are recorded under.
 * @returns The diverging reference files and the differing conclusions.
 */
async function compareSources(projectRoot: string, label: string) {
  const config = loadConfig(projectRoot).config ?? createDefaultConfig();
  const snapshot = await createProjectSnapshot(
    projectRoot,
    createAdapterRegistry(),
    config,
    { compareAdapterEvidence: true },
  );
  const rules = getActiveRules(
    loadBuiltinRules(
      config.rules,
      config.structure?.additionalAllowedPeers,
      undefined,
      undefined,
      config.structure?.additionalOrganNames,
    ),
  );
  const maxDepth = resolveMaxDepth(config);
  const divergentPaths = snapshot.diagnostics
    .filter(({ code }) => code === 'facts-adapter-divergence')
    .map(({ path }) => toProjectRelativePath(projectRoot, path ?? projectRoot))
    .sort();
  const fromAdapter = await adapterReferences(projectRoot);
  const adapterConclusions = conclusionsOf(
    snapshot,
    graphFrom(snapshot, fromAdapter),
    rules,
    maxDepth,
  );
  const factsConclusions = conclusionsOf(
    snapshot,
    snapshot.dependencyGraph,
    rules,
    maxDepth,
  );
  const counts = {
    scannedFiles: snapshot.dependencyGraph.nodePaths.length,
    adapterReferences: fromAdapter.length,
    edges: snapshot.dependencyGraph.edges.length,
    divergentFiles: divergentPaths.length,
    cycles: factsConclusions.cycles.length,
    violations: factsConclusions.violations.length,
    unknownFiles: factsConclusions.unknownFiles.length,
  };
  measured[label] = counts;
  return { divergentPaths, adapterConclusions, factsConclusions, counts };
}

/**
 * Write one fixture project and seed its facts.
 * @param prefix Temporary directory prefix.
 * @param files Project-relative path to contents.
 * @returns The absolute root, removed when the file finishes.
 */
async function writeSeededProject(
  prefix: string,
  files: Readonly<Record<string, string>>,
): Promise<string> {
  const root = createFixtureProjectRoot(prefix);
  temporaryRoots.push(root);
  for (const [path, contents] of Object.entries(files)) {
    const absolute = join(root, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, contents);
  }
  await seedFacts(root);
  return root;
}

/** An FCA fixture whose two fractals reference each other through entry points. */
const HARNESS_FILES: Readonly<Record<string, string>> = {
  'INTENT.md': '# Fixture\n\n## Purpose\n\nHold the gate fixture.\n',
  'index.ts': "export { left } from './left/index.js';\n",
  'left/INTENT.md': '# Left\n\n## Purpose\n\nLeft fractal.\n',
  'left/index.ts': "export { left } from './use.js';\n",
  'left/use.ts':
    "import { right } from '../right/index.js';\n\nexport const left = right;\n",
  'right/INTENT.md': '# Right\n\n## Purpose\n\nRight fractal.\n',
  'right/index.ts': 'export const right = 1;\n',
};

/**
 * Sources whose references an adapter reads with some uncertainty.
 *
 * One shape per way a lexer can be wrong about where a reference is: an
 * apostrophe that opens a string nothing closes, a quote inside a regex, a
 * template literal that reads like an import, a dynamic import with no
 * literal, a star re-export, a type-only import, an import inside a comment,
 * and the A40 shape — the same specifier in a real import and in a comment.
 * Two files would leave most of those untried, and this gate runs once.
 */
const UNCERTAIN_FILES: Readonly<Record<string, string>> = {
  ...HARNESS_FILES,
  'left/note.tsx':
    "export const Note = () => <p>Don't</p>; export { right } from '../right/index.js';\n",
  'left/loose.ts':
    "import { join } from 'node:path';\n\nexport const loose = join('a', 'b');\n",
  'left/regex.ts':
    "export const quoted = /[']/;\nexport { right } from '../right/index.js';\n",
  'left/template.ts':
    'export const text = `import { right } from "../right/index.js";`;\n',
  'left/dynamic.ts':
    "export const load = (name: string) => import(name);\n\nexport const also = () => import('../right/index.js');\n",
  'left/star.ts': "export * from '../right/index.js';\n",
  'left/typeOnly.ts':
    "import type { Right } from '../right/index.js';\n\nexport type Alias = Right;\n",
  'left/commented.ts':
    "// import { right } from '../right/index.js';\nexport const commented = 1;\n",
  'left/both.ts':
    "import { right } from '../right/index.js';\n// import { right } from '../right/index.js';\n\nexport const both = right;\n",
};

describe('the facts store and the adapters reach the same conclusions', () => {
  it.for([
    ['harness fixture', HARNESS_FILES, 0],
    ['uncertainty fixture', UNCERTAIN_FILES, 1],
  ] as const)(
    'agrees on a %s project',
    async ([label, files, leastUnknown]) => {
      const root = await writeSeededProject(`filid-gate-${label[0]}-`, files);

      const { divergentPaths, adapterConclusions, factsConclusions, counts } =
        await compareSources(root, label);

      // An empty reference set or an empty graph would make every comparison
      // below pass by having nothing to compare.
      expect(counts.adapterReferences).toBeGreaterThan(0);
      expect(counts.edges).toBeGreaterThan(0);
      // The uncertainty fixture has to leave a file unknown on BOTH sides: the
      // adapter graph is handed no facts-derived unknown file, so its entry can
      // only come from the certainty its own references carry.
      expect(factsConclusions.unknownFiles.length).toBeGreaterThanOrEqual(
        leastUnknown,
      );
      expect(
        divergentPaths.filter((path) => !(path in DECLARED_DIFFERENCES)),
      ).toEqual([]);
      expect(factsConclusions).toEqual(adapterConclusions);
    },
  );

  it('agrees on this repository, the largest input', async () => {
    await seedFacts(REPOSITORY_ROOT);

    const { divergentPaths, adapterConclusions, factsConclusions, counts } =
      await compareSources(REPOSITORY_ROOT, 'repository');

    expect(counts.adapterReferences).toBeGreaterThan(0);
    expect(counts.edges).toBeGreaterThan(0);
    expect(
      divergentPaths.filter((path) => !(path in DECLARED_DIFFERENCES)),
    ).toEqual([]);
    expect(factsConclusions).toEqual(adapterConclusions);
  }, 900000);
});
