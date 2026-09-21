import { describe, it } from 'vitest';

import { relocateThroughMoves } from '../../../../core/restructure/imports/relocateThroughMoves.js';
import { cycleIdentity } from '../../../../core/restructure/validator/cycleIdentity.js';
import type { PlannedMove } from '../../../../types/restructure.js';

import { checkProperty } from './helpers/checkProperty.js';
import type { Random } from './helpers/createRandom.js';

/** Owner paths routes are drawn from; nested ones follow a moved parent. */
const OWNERS = [
  '/p/a',
  '/p/a/x',
  '/p/a/x/deep',
  '/p/b',
  '/p/b/y',
  '/p/c',
  '/p/d',
];

/** Runs per property: 2,000 routes of at most 7 owners take a few milliseconds. */
const RUNS = 2000;

/**
 * A closed route through distinct owners.
 * @param random Seeded source.
 * @param size Bound on the owner count; at least two are used.
 * @returns Owner paths with the first repeated at the end.
 */
function randomRoute(random: Random, size: number): string[] {
  const owners = random
    .shuffle(OWNERS)
    .slice(0, 2 + random.int(Math.min(size, OWNERS.length - 1)));
  return [...owners, owners[0]];
}

/**
 * The member owners of a route as a sorted, duplicate-free list.
 * @param route Closed route.
 * @returns Owner paths, the closing repeat dropped.
 */
function nodeSet(route: readonly string[]): string[] {
  return [...new Set(route.slice(0, -1))].sort();
}

describe('a cycle identity names its component node set', () => {
  it('is the same for every rotation of a route', () => {
    checkProperty({
      runs: RUNS,
      maxSize: 6,
      generate: (random, size) => {
        const route = randomRoute(random, size);
        return { route, shift: random.int(route.length - 1) };
      },
      check: ({ route, shift }) => {
        const open = route.slice(0, -1);
        const rotated = [...open.slice(shift), ...open.slice(0, shift)];
        return cycleIdentity([...rotated, rotated[0]]) === cycleIdentity(route)
          ? null
          : 'rotation changed the identity';
      },
    });
  });

  it('is equal for two routes exactly when their node sets are equal', () => {
    checkProperty({
      runs: RUNS,
      maxSize: 3,
      generate: (random, size) => ({
        left: randomRoute(random, size),
        right: randomRoute(random, size),
      }),
      check: ({ left, right }) => {
        const sameNodes =
          nodeSet(left).join('\n') === nodeSet(right).join('\n');
        const sameIdentity = cycleIdentity(left) === cycleIdentity(right);
        return sameNodes === sameIdentity
          ? null
          : `same nodes=${sameNodes}, same identity=${sameIdentity}`;
      },
    });
  });

  it('is unchanged by relocation through no moves', () => {
    checkProperty({
      runs: RUNS,
      maxSize: 6,
      generate: (random, size) => randomRoute(random, size),
      check: (route) =>
        cycleIdentity(route.map((owner) => relocateThroughMoves(owner, []))) ===
        cycleIdentity(route)
          ? null
          : 'an empty move list changed the identity',
    });
  });

  it('moves consistently when a directory move relocates owners below it', () => {
    checkProperty({
      runs: RUNS,
      maxSize: 6,
      generate: (random, size) => ({
        route: randomRoute(random, size),
        moves: [
          {
            sourcePath: random.pick(['/p/a', '/p/a/x', '/p/b']),
            targetPath: random.pick(['/p/z', '/p/c/moved', '/p/b/inner']),
          },
        ] satisfies PlannedMove[],
      }),
      check: ({ route, moves }) => {
        const relocate = (owner: string) => relocateThroughMoves(owner, moves);
        const relocatedIdentity = [
          ...new Set(cycleIdentity(route).split('\n').map(relocate)),
        ]
          .sort()
          .join('\n');
        return cycleIdentity(route.map(relocate)) === relocatedIdentity
          ? null
          : 'recomputing after the move differs from moving the identity';
      },
    });
  });
});
