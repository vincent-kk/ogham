import { pathForCompare } from '@ogham/cross-platform';

import type { MoveInstruction } from '../../../types/restructure.js';

/** Files each consumer must load once the whole plan ran, as comparable paths keyed by the consumer's comparable path. */
export type RequiredLoads = ReadonlyMap<string, ReadonlySet<string>>;

/**
 * Gather, per consumer, every file the plan's import requirements make it load.
 * @param moves - Instructions whose `affectedImports` and `preservedImports` sit at final paths
 * @returns The required files of every consumer across the whole plan
 */
export function collectRequiredLoads(
  moves: readonly MoveInstruction[],
): RequiredLoads {
  const loads = new Map<string, Set<string>>();
  for (const move of moves)
    for (const entry of [...move.affectedImports, ...move.preservedImports]) {
      const consumer = pathForCompare(entry.consumerPath);
      const files = loads.get(consumer) ?? new Set<string>();
      files.add(pathForCompare(entry.requiredResolvedPath));
      loads.set(consumer, files);
    }
  return loads;
}
