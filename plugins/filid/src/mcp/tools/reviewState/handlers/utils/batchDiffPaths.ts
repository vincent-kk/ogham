/** Upper bound on paths per `git diff` invocation. */
const PATHS_PER_BATCH = 200;

/**
 * Argument characters per `git diff` invocation, held well under the
 * 32,767-character Windows command-line limit.
 */
const BATCH_ARGUMENT_LIMIT = 24_000;

/** Characters a path adds to the command line beyond its own length. */
const PATH_OVERHEAD = 3;

/**
 * Group paths into `git diff` batches that respect both a count and a
 * command-line length bound, preserving order.
 *
 * A batch always holds at least one path, so a single path longer than the
 * length bound still spawns on its own, exactly as a per-path read would.
 *
 * @param paths Paths in roster order.
 * @returns Consecutive, non-empty batches covering every path once.
 */
export function batchDiffPaths(paths: readonly string[]): string[][] {
  const batches: string[][] = [];
  let current: string[] = [];
  let length = 0;
  for (const path of paths) {
    const cost = path.length + PATH_OVERHEAD;
    const full =
      current.length >= PATHS_PER_BATCH || length + cost > BATCH_ARGUMENT_LIMIT;
    if (current.length > 0 && full) {
      batches.push(current);
      current = [];
      length = 0;
    }
    current.push(path);
    length += cost;
  }
  return current.length > 0 ? [...batches, current] : batches;
}
