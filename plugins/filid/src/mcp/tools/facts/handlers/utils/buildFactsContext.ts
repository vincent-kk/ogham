import {
  readEpochSnapshot,
  readProjectFacts,
  writeEpochSnapshot,
} from '../../../../../core/facts/index.js';
import type {
  ProjectFacts,
  ResolutionEpochSnapshot,
} from '../../../../../core/facts/index.js';
import { loadConfig } from '../../../../../core/infra/configLoader/index.js';
import { runWithRequestMemo } from '../../../../../lib/runWithRequestMemo.js';

/** Everything both facts actions derive from the project before they diverge. */
export interface FactsContext extends ProjectFacts {
  /**
   * The epoch filid last recorded, read before this call overwrote it.
   *
   * Null when none was readable, which makes the epoch difference lists empty
   * rather than guessed.
   */
  previousEpoch: ResolutionEpochSnapshot | null;
}

/**
 * Read the project state both facts actions start from.
 *
 * What the store holds comes from `readProjectFacts`, which analysis reads
 * through as well — one assembly for both, so the tool and the snapshot cannot
 * disagree about which files are in scope or which epoch is current.
 *
 * What this adds is the part only a tool call may do: the epoch snapshot is
 * persisted on every call, so that a caller which reads an epoch now and submits
 * after the tree moves can be told which paths moved instead of only that the
 * epoch differs. An analysis pass must not move that state.
 *
 * One call is one request-memo scope, so the scan work this context repeats —
 * the ignored-path query above all — runs once. The scope closes with the
 * context rather than spanning the facts action, which goes on to write into
 * the store.
 *
 * @param projectRoot - Absolute project root, used as given.
 * @returns Scope, scanned paths, store contents and the current epoch.
 */
export function buildFactsContext(
  projectRoot: string,
): Promise<FactsContext> {
  return runWithRequestMemo(async (): Promise<FactsContext> => {
    const facts = await readProjectFacts(
      projectRoot,
      loadConfig(projectRoot).config ?? undefined,
    );
    const previousEpoch = readEpochSnapshot(facts.storePaths.epochSnapshotPath);
    writeEpochSnapshot(facts.storePaths.epochSnapshotPath, facts.epoch);
    return { ...facts, previousEpoch };
  });
}
