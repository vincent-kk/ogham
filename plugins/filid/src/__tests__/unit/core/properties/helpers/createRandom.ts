/** A deterministic source of random choices for one seed. */
export interface Random {
  /** A float in [0, 1). */
  next(): number;
  /** An integer in [0, bound). */
  int(bound: number): number;
  /** One element of a non-empty list. */
  pick<T>(items: readonly T[]): T;
  /** True with the given probability. */
  chance(probability: number): boolean;
  /** A copy of the list in a random order. */
  shuffle<T>(items: readonly T[]): T[];
}

/**
 * Create a seeded source (mulberry32): the same seed yields the same sequence
 * on every machine, so a reported seed replays its failure exactly.
 * @param seed Any 32-bit integer.
 * @returns The source.
 */
export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (bound: number): number => Math.floor(next() * bound);
  return {
    next,
    int,
    pick: (items) => items[int(items.length)],
    chance: (probability) => next() < probability,
    shuffle: (items) => {
      const copy = [...items];
      for (let index = copy.length - 1; index > 0; index -= 1) {
        const other = int(index + 1);
        [copy[index], copy[other]] = [copy[other], copy[index]];
      }
      return copy;
    },
  };
}
