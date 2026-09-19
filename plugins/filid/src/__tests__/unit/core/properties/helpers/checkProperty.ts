import { type Random, createRandom } from './createRandom.js';

/** One property: a generator of sized inputs and a check that names what failed. */
export interface PropertySpec<Input> {
  /** Number of generated inputs; each uses the seed `baseSeed + run`. */
  runs: number;
  /** Largest size passed to `generate`; each seed picks its size in 1..maxSize. */
  maxSize: number;
  /**
   * Build one input from a seeded source.
   * @param random Deterministic source for this seed.
   * @param size Upper bound on the input's element count.
   */
  generate(random: Random, size: number): Input;
  /**
   * Check one input.
   * @param input Generated input.
   * @returns Null when the property holds, otherwise what failed.
   */
  check(input: Input): string | null;
}

/** Seed of the first run; `FILID_PROPERTY_SEED` replays a reported failure. */
const BASE_SEED = Number(process.env.FILID_PROPERTY_SEED ?? 20260920);

/**
 * Run a property over seeded inputs and throw on the first failure.
 *
 * A failing seed is shrunk by size: the same seed is regenerated at every
 * smaller size and the smallest input that still fails is reported, with the
 * seed that replays it.
 * @param spec Generator, check, run count and size bound.
 * @returns Nothing when every run holds.
 * @throws An error naming the seed, the shrunk size and input, and the failure.
 */
export function checkProperty<Input>(spec: PropertySpec<Input>): void {
  for (let run = 0; run < spec.runs; run += 1) {
    const seed = BASE_SEED + run;
    const size = 1 + (seed % spec.maxSize);
    if (spec.check(spec.generate(createRandom(seed), size)) === null) continue;
    for (let smaller = 1; smaller <= size; smaller += 1) {
      const input = spec.generate(createRandom(seed), smaller);
      const failure = spec.check(input);
      if (failure !== null)
        throw new Error(
          `property failed: seed=${seed} shrunk to size=${smaller} (FILID_PROPERTY_SEED=${seed} replays it first)\nfailure: ${failure}\ninput: ${JSON.stringify(input, null, 1)}`,
        );
    }
  }
}
