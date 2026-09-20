import type { Random } from '../../../core/properties/helpers/createRandom.js';
import { createRandom } from '../../../core/properties/helpers/createRandom.js';

/** One property whose check has to await the system under test. */
export interface AsyncPropertySpec {
  /** Number of generated inputs; each uses the seed `baseSeed + run`. */
  runs: number;
  /** Largest size passed to `check`; each seed picks its size in 1..maxSize. */
  maxSize: number;
  /**
   * Drive one scenario and report what broke.
   * @param random Deterministic source for this seed.
   * @param size Upper bound on the scenario's operation count.
   * @returns Null when the property holds, otherwise what failed.
   */
  check(random: Random, size: number): Promise<string | null>;
}

/** Seed of the first run; `FILID_PROPERTY_SEED` replays a reported failure. */
const BASE_SEED = Number(process.env.FILID_PROPERTY_SEED ?? 20260920);

/**
 * Run an asynchronous property over seeded scenarios, throwing on the first
 * failure.
 *
 * The synchronous `checkProperty` cannot be reused here: this property drives
 * the MCP handlers, which read and write the filesystem and return promises.
 * The seed contract is the same one, so a reported seed replays the failure.
 *
 * A failing seed is shrunk by size — the same seed is replayed at every smaller
 * operation count and the smallest scenario that still fails is reported.
 *
 * @param spec - Run count, size bound and the scenario driver.
 * @returns Nothing when every run holds.
 * @throws An error naming the seed, the shrunk size and the failure.
 */
export async function checkAsyncProperty(
  spec: AsyncPropertySpec,
): Promise<void> {
  for (let run = 0; run < spec.runs; run += 1) {
    const seed = BASE_SEED + run;
    const size = 1 + (seed % spec.maxSize);
    if ((await spec.check(createRandom(seed), size)) === null) continue;
    for (let smaller = 1; smaller <= size; smaller += 1) {
      const failure = await spec.check(createRandom(seed), smaller);
      if (failure !== null)
        throw new Error(
          `property failed: seed=${seed} shrunk to size=${smaller} (FILID_PROPERTY_SEED=${seed} replays it first)\nfailure: ${failure}`,
        );
    }
  }
}
