import { describe, it } from 'vitest';

import { DEPENDENCY_DIAGNOSTIC_CODES } from '../../../../constants/dependencyDiagnosticCodes.js';
import { buildDependencyGraph } from '../../../../core/analysis/dependencyGraph/index.js';
import type { DependencyReference } from '../../../../types/adapters.js';
import type { UnknownFile } from '../../../../types/fractal.js';

import { checkProperty } from './helpers/checkProperty.js';
import type { Random } from './helpers/createRandom.js';

/** Root every generated path sits under; it is not an owner, so `/p/loose` has none. */
const PROJECT_ROOT = '/p';

/** Runs per property: 500 graphs of at most 8 owners and 40 references take a few tens of milliseconds. */
const RUNS = 500;

/** Reference shapes the generator draws. */
type ReferenceShape =
  | 'edge'
  | 'uncertain'
  | 'unresolved'
  | 'uncertain-unresolved'
  | 'unowned'
  | 'verification';

/** One generated graph input. */
interface GraphInput {
  nodePaths: string[];
  references: DependencyReference[];
  verificationPaths: string[];
  seeds: UnknownFile[];
  shapes: ReferenceShape[];
}

/**
 * A file of an owner.
 * @param owner Owner path.
 * @param random Seeded source.
 * @returns One of three files under the owner.
 */
function fileOf(owner: string, random: Random): string {
  return `${owner}/f${random.int(3)}.ts`;
}

/**
 * A graph input of random references between flat owners.
 * @param random Seeded source.
 * @param size Bound on the owner count; references are five times as many.
 * @param allowed Reference shapes to draw.
 * @returns The input, with the shape of each reference in order.
 */
function randomGraphInput(
  random: Random,
  size: number,
  allowed: readonly ReferenceShape[],
): GraphInput {
  const nodePaths = Array.from(
    { length: 2 + random.int(Math.min(size, 7)) },
    (_, index) => `${PROJECT_ROOT}/m${index}`,
  );
  const verificationPaths: string[] = [];
  const shapes: ReferenceShape[] = [];
  const references = Array.from({ length: 1 + random.int(size * 5) }, () => {
    const shape = random.pick(allowed);
    shapes.push(shape);
    const sourceFile =
      shape === 'verification'
        ? `${random.pick(nodePaths)}/f${random.int(3)}.test.ts`
        : fileOf(random.pick(nodePaths), random);
    if (shape === 'verification') verificationPaths.push(sourceFile);
    const resolvedPath =
      shape === 'unresolved' || shape === 'uncertain-unresolved'
        ? null
        : shape === 'unowned'
          ? `${PROJECT_ROOT}/loose/x.ts`
          : fileOf(random.pick(nodePaths), random);
    return {
      sourceFile,
      rawSpecifier: `./r${random.int(100)}.js`,
      resolvedPath,
      kind: 'static' as const,
      ...(shape === 'uncertain' || shape === 'uncertain-unresolved'
        ? { certainty: 'indeterminate' as const }
        : {}),
    };
  });
  const seeds = random.chance(0.3)
    ? [
        {
          path: `m0/f${random.int(3)}.ts`,
          causes: random.shuffle([
            DEPENDENCY_DIAGNOSTIC_CODES.ANALYSIS_FAILED,
            'ambiguous-adapter-claim',
          ]),
        },
      ]
    : [];
  return { nodePaths, references, verificationPaths, seeds, shapes };
}

/**
 * Build the graph of an input, optionally with its references in another order.
 * @param input Generated input.
 * @param references References to use in place of the input's.
 * @param organPaths Organ paths excluded from cycle adjacency.
 * @returns The dependency graph.
 */
function build(
  input: GraphInput,
  references = input.references,
  organPaths: string[] = [],
) {
  return buildDependencyGraph(input.nodePaths, references, 'exact', {
    projectRoot: PROJECT_ROOT,
    unknownFiles: input.seeds,
    verificationPaths: input.verificationPaths,
    organPaths,
  });
}

/**
 * Whether every route is a closed walk over the given owner edges.
 * @param cycles Reported routes.
 * @param edges Owner edges as `from→to`.
 * @returns The first route that is not, or null.
 */
function firstOpenRoute(
  cycles: readonly string[][],
  edges: ReadonlySet<string>,
): string | null {
  for (const route of cycles)
    if (
      route.length < 3 ||
      route[0] !== route[route.length - 1] ||
      route.slice(1).some((to, index) => !edges.has(`${route[index]}→${to}`))
    )
      return route.join(' → ');
  return null;
}

const ALL_SHAPES: readonly ReferenceShape[] = [
  'edge',
  'edge',
  'edge',
  'uncertain',
  'unresolved',
  'uncertain-unresolved',
  'unowned',
  'verification',
];

describe('buildDependencyGraph over random references', () => {
  it('does not depend on the order of its references', () => {
    checkProperty({
      runs: RUNS,
      maxSize: 8,
      generate: (random, size) => {
        const input = randomGraphInput(random, size, ALL_SHAPES);
        return { input, shuffled: random.shuffle(input.references) };
      },
      check: ({ input, shuffled }) =>
        JSON.stringify(build(input)) === JSON.stringify(build(input, shuffled))
          ? null
          : 'shuffled references built a different graph',
    });
  });

  it('is exact exactly when no file is unknown, with sorted unique paths and causes', () => {
    checkProperty({
      runs: RUNS,
      maxSize: 8,
      generate: (random, size) => randomGraphInput(random, size, ALL_SHAPES),
      check: (input) => {
        const graph = build(input);
        if ((graph.certainty === 'exact') !== (graph.unknownFiles.length === 0))
          return `certainty ${graph.certainty} with ${graph.unknownFiles.length} unknown files`;
        const paths = graph.unknownFiles.map(({ path }) => path);
        if (
          paths.some(
            (path, index) =>
              index > 0 && paths[index - 1].localeCompare(path) >= 0,
          )
        )
          return `paths not strictly sorted: ${paths}`;
        const unsorted = graph.unknownFiles.find(
          ({ causes }) =>
            causes.join('\n') !== [...new Set(causes)].sort().join('\n'),
        );
        return unsorted ? `causes not sorted unique on ${unsorted.path}` : null;
      },
    });
  });

  it('turns no uncertain, unresolved or unowned production reference into an edge, and lists its source', () => {
    checkProperty({
      runs: RUNS,
      maxSize: 8,
      generate: (random, size) => randomGraphInput(random, size, ALL_SHAPES),
      check: (input) => {
        const graph = build(input);
        const evidence = graph.edges.flatMap((edge) => edge.evidence);
        const expected: Record<string, string[]> = {
          uncertain: [DEPENDENCY_DIAGNOSTIC_CODES.UNCERTAIN],
          unresolved: [DEPENDENCY_DIAGNOSTIC_CODES.UNRESOLVED],
          'uncertain-unresolved': [
            DEPENDENCY_DIAGNOSTIC_CODES.UNCERTAIN,
            DEPENDENCY_DIAGNOSTIC_CODES.UNRESOLVED,
          ],
          unowned: [DEPENDENCY_DIAGNOSTIC_CODES.UNOWNED],
        };
        for (const [index, reference] of input.references.entries()) {
          const causes = expected[input.shapes[index]];
          if (!causes) continue;
          if (
            evidence.some(
              (item) =>
                item.sourceFile === reference.sourceFile &&
                item.rawSpecifier === reference.rawSpecifier &&
                item.resolvedPath === reference.resolvedPath,
            )
          )
            return `${input.shapes[index]} reference became an edge`;
          const listed = graph.unknownFiles.find(
            ({ path }) => path === reference.sourceFile.slice(3),
          );
          const missing = causes.filter(
            (cause) => !listed?.causes.includes(cause),
          );
          if (missing.length > 0)
            return `${reference.sourceFile} lacks ${missing}`;
        }
        return null;
      },
    });
  });

  it('reports no cycle on a DAG, and a cycle through a back edge once one is added', () => {
    checkProperty({
      runs: RUNS,
      maxSize: 8,
      generate: (random, size) => {
        const count = 2 + random.int(Math.min(size, 7));
        const order = random.shuffle(
          Array.from(
            { length: count },
            (_, index) => `${PROJECT_ROOT}/m${index}`,
          ),
        );
        const pairs: [number, number][] = [];
        for (let from = 0; from < count; from += 1)
          for (let to = from + 1; to < count; to += 1)
            if (random.chance(0.4)) pairs.push([from, to]);
        if (pairs.length === 0) pairs.push([0, 1]);
        const reference = (from: string, to: string): DependencyReference => ({
          sourceFile: `${from}/f.ts`,
          rawSpecifier: './x.js',
          resolvedPath: `${to}/index.ts`,
          kind: 'static',
        });
        const reaches = Array.from({ length: count }, (_, index) => [index]);
        for (let from = count - 1; from >= 0; from -= 1)
          for (const [start, end] of pairs)
            if (start === from)
              reaches[from] = [...new Set([...reaches[from], ...reaches[end]])];
        const reachable = reaches.flatMap((ends, start) =>
          ends.filter((end) => end !== start).map((end) => [start, end]),
        );
        const [backTo, backFrom] = random.pick(reachable);
        return {
          nodePaths: [...order].sort(),
          dag: pairs.map(([from, to]) => reference(order[from], order[to])),
          back: reference(order[backFrom], order[backTo]),
          backPair: `${order[backFrom]}→${order[backTo]}`,
        };
      },
      check: ({ nodePaths, dag, back, backPair }) => {
        const options = { projectRoot: PROJECT_ROOT };
        const acyclic = buildDependencyGraph(nodePaths, dag, 'exact', options);
        if (acyclic.cycles.length > 0)
          return `a DAG reported ${acyclic.cycles.length} cycles`;
        const cyclic = buildDependencyGraph(
          nodePaths,
          [...dag, back],
          'exact',
          options,
        );
        if (cyclic.cycles.length === 0) return 'the back edge closed no cycle';
        const through = cyclic.cycles.every((route) =>
          route
            .slice(1)
            .some((to, index) => `${route[index]}→${to}` === backPair),
        );
        return through ? null : 'a reported cycle avoids the back edge';
      },
    });
  });

  it('reports every cycle as a closed walk over its edges', () => {
    checkProperty({
      runs: RUNS,
      maxSize: 8,
      generate: (random, size) => randomGraphInput(random, size, ['edge']),
      check: (input) => {
        const graph = build(input);
        const edges = new Set(
          graph.edges.map(
            ({ fromFractalPath, toFractalPath }) =>
              `${fromFractalPath}→${toFractalPath}`,
          ),
        );
        const open = firstOpenRoute(graph.cycles, edges);
        return open === null ? null : `not a closed walk: ${open}`;
      },
    });
  });

  it('lets no verification reference or owned-organ reference close a cycle', () => {
    checkProperty({
      runs: RUNS,
      maxSize: 6,
      generate: (random, size) => {
        const parents = Array.from(
          { length: 1 + random.int(Math.min(size, 5)) },
          (_, index) => `${PROJECT_ROOT}/m${index}`,
        );
        const order = parents.flatMap((parent) => [parent, `${parent}/c`]);
        const reference = (
          sourceFile: string,
          resolvedPath: string,
        ): DependencyReference => ({
          sourceFile,
          rawSpecifier: './x.js',
          resolvedPath,
          kind: 'static',
        });
        const forward: DependencyReference[] = [];
        for (let from = 0; from < order.length; from += 1)
          for (let to = from + 1; to < order.length; to += 1)
            if (random.chance(0.4))
              forward.push(
                reference(`${order[from]}/f.ts`, `${order[to]}/index.ts`),
              );
        const verificationPaths: string[] = [];
        const backward = Array.from({ length: 1 + random.int(4) }, () => {
          const parent = random.pick(parents);
          if (random.chance(0.5))
            return reference(`${parent}/c/f.ts`, `${parent}/utils/helper.ts`);
          const [later, earlier] = [
            random.int(order.length),
            random.int(order.length),
          ].sort((left, right) => right - left);
          const sourceFile = `${order[later]}/f.test.ts`;
          verificationPaths.push(sourceFile);
          return reference(sourceFile, `${order[earlier]}/index.ts`);
        });
        return {
          nodePaths: [...order].sort(),
          organPaths: parents.map((parent) => `${parent}/utils`),
          references: random.shuffle([...forward, ...backward]),
          verificationPaths,
        };
      },
      check: ({ nodePaths, organPaths, references, verificationPaths }) => {
        const graph = buildDependencyGraph(nodePaths, references, 'exact', {
          projectRoot: PROJECT_ROOT,
          organPaths,
          verificationPaths,
        });
        return graph.cycles.length === 0
          ? null
          : `cycles closed: ${graph.cycles.map((route) => route.join(' → ')).join('; ')}`;
      },
    });
  });
});
