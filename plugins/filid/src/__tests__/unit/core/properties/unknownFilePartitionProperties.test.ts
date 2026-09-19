import { describe, it } from 'vitest';

import {
  type RelevanceTarget,
  partitionUnknownFiles,
} from '../../../../core/analysis/dependencyGraph/index.js';
import type { UnknownFile } from '../../../../types/fractal.js';

import { checkProperty } from './helpers/checkProperty.js';
import type { Random } from './helpers/createRandom.js';

/** Project-relative files unknown files and targets are drawn from. */
const FILES = [
  'a/value.ts',
  'a/index.ts',
  'a/inner/deep.ts',
  'b/note.tsx',
  'b/use.ts',
  'c/other.ts',
  'index.ts',
  'loose.ts',
];

/** Causes an unknown file may carry. */
const CAUSES = [
  'uncertain-local-dependency',
  'unresolved-local-dependency',
  'unowned-local-dependency',
  'symlink-not-followed',
];

/** Runs per property: 1,000 partitions of at most 8 files take a few milliseconds. */
const RUNS = 1000;

/** One generated partition input; `texts` maps a path to its text, absent when unreadable. */
interface PartitionInput {
  unknownFiles: UnknownFile[];
  targets: RelevanceTarget[];
  extraTargets: RelevanceTarget[];
  texts: Record<string, string>;
}

/**
 * A random relevance target.
 * @param random Seeded source.
 * @returns A file, module index or directory target.
 */
function randomTarget(random: Random): RelevanceTarget {
  const kind = random.pick(['file', 'module-index', 'directory'] as const);
  return kind === 'directory'
    ? { path: random.pick(['a', 'a/inner', 'b', 'c']), kind }
    : { path: random.pick(FILES.filter((file) => file !== 'index.ts')), kind };
}

/**
 * A random partition input.
 * @param random Seeded source.
 * @param size Bound on the unknown file and target counts.
 * @returns Unknown files with distinct paths, targets, extra targets and file texts.
 */
function randomInput(random: Random, size: number): PartitionInput {
  const unknownFiles = random
    .shuffle(FILES)
    .slice(0, 1 + random.int(Math.min(size, FILES.length)))
    .map((path) => ({
      path,
      causes: [random.pick(CAUSES)],
    }));
  const texts: Record<string, string> = {};
  for (const { path } of unknownFiles)
    if (!random.chance(0.15))
      texts[path] =
        `import x from './${random.pick(['value', 'deep', 'a', 'other', 'nothing'])}.js';\n`;
  return {
    unknownFiles,
    targets: Array.from({ length: random.int(size) }, () =>
      randomTarget(random),
    ),
    extraTargets: Array.from({ length: 1 + random.int(2) }, () =>
      randomTarget(random),
    ),
    texts,
  };
}

/**
 * Partition an input with the given targets.
 * @param input Generated input.
 * @param targets Targets to partition by.
 * @returns Relevant and other paths.
 */
function partition(
  input: PartitionInput,
  targets: readonly RelevanceTarget[],
): { relevant: string[]; other: string[] } {
  const result = partitionUnknownFiles(
    input.unknownFiles,
    targets,
    (path) => input.texts[path] ?? null,
  );
  return {
    relevant: result.relevant.map(({ path }) => path),
    other: result.other.map(({ path }) => path),
  };
}

describe('partitionUnknownFiles splits every unknown file exactly once', () => {
  it('covers the input, disjointly, in input order, the same way twice', () => {
    checkProperty({
      runs: RUNS,
      maxSize: 8,
      generate: randomInput,
      check: (input) => {
        const { relevant, other } = partition(input, input.targets);
        const inputPaths = input.unknownFiles.map(({ path }) => path);
        if (relevant.some((path) => other.includes(path)))
          return 'a file is both relevant and other';
        const merged = inputPaths.filter(
          (path) => relevant.includes(path) || other.includes(path),
        );
        if (merged.length !== inputPaths.length)
          return 'the groups do not cover the input';
        const inOrder = (group: string[]) =>
          group.every(
            (path, index) =>
              index === 0 ||
              inputPaths.indexOf(group[index - 1]) < inputPaths.indexOf(path),
          );
        if (!inOrder(relevant) || !inOrder(other))
          return 'a group is out of input order';
        return JSON.stringify(partition(input, input.targets)) ===
          JSON.stringify({ relevant, other })
          ? null
          : 'a second call split differently';
      },
    });
  });

  it('never makes fewer files relevant when targets are added', () => {
    checkProperty({
      runs: RUNS,
      maxSize: 8,
      generate: randomInput,
      check: (input) => {
        const before = partition(input, input.targets).relevant;
        const after = partition(input, [
          ...input.targets,
          ...input.extraTargets,
        ]).relevant;
        const lost = before.filter((path) => !after.includes(path));
        return lost.length === 0 ? null : `no longer relevant: ${lost}`;
      },
    });
  });

  it('makes every file relevant for a module index at the project root', () => {
    checkProperty({
      runs: RUNS,
      maxSize: 8,
      generate: randomInput,
      check: (input) =>
        partition(input, [{ path: 'index.ts', kind: 'module-index' }]).other
          .length === 0
          ? null
          : 'a file stayed other beside a root module index',
    });
  });

  it('always makes an unfollowed link and an unreadable file relevant', () => {
    checkProperty({
      runs: RUNS,
      maxSize: 8,
      generate: randomInput,
      check: (input) => {
        const { other } = partition(input, input.targets);
        const wrong = input.unknownFiles.filter(
          ({ path, causes }) =>
            other.includes(path) &&
            (causes.includes('symlink-not-followed') ||
              input.texts[path] === undefined),
        );
        return wrong.length === 0
          ? null
          : `left other: ${wrong.map(({ path }) => path)}`;
      },
    });
  });
});
