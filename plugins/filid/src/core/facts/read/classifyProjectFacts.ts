import {
  canonicalizeTargetPathSync,
  pathForCompare,
  portableResolve,
} from '@ogham/cross-platform';

import { checkDeclaredInputs } from '../validation/utils/checkDeclaredInputs.js';
import { computeLineDigest } from '../sideTable/utils/computeLineDigest.js';
import { createDeclaredInputHasher } from '../epoch/createDeclaredInputHasher.js';
import { hashProjectFile } from '../validation/utils/hashProjectFile.js';
import type { ProjectFileDigest } from '../validation/utils/hashProjectFile.js';
import { isOpenAdjudication } from '../sideTable/isOpenAdjudication.js';
import type { AdjudicationItem } from '../sideTable/types/adjudicationTypes.js';
import { classifyFactsFile } from '../state/classifyFactsFile.js';
import type { FactsFileState } from '../state/classifyFactsFile.js';

import type { ProjectFacts } from './readProjectFacts.js';

/**
 * Where a caller collects the bytes this classification already read, so the
 * same request does not read them a second time.
 */
export interface ClassifiedFileBytes {
  /**
   * Filled with the bytes of every file read here, keyed by
   * `pathForCompare(portableResolve(projectRoot, path))` — the key
   * `computeSnapshotHash` looks a file up by. The caller owns the map.
   */
  bytes: Map<string, Uint8Array>;
  /**
   * Collecting stops once holding one more file would pass this total. A file
   * left uncollected is simply read again by whoever needs it, so the cap
   * bounds memory without changing any answer.
   */
  maxTotalBytes: number;
}

/**
 * Decide the facts state of every scanned file (spec §3).
 *
 * The one classification both readers use, so what analysis concludes about a
 * file and what `status` says about it cannot drift apart. The file is read
 * only when there is something to bind to it — a record, or an item whose
 * expiry has to be checked — because a file with neither is `missing` whatever
 * its bytes say.
 *
 * A file whose judgement shard did not read is `uncertain` whatever its record
 * says: the shard is named by the leading digits of the path digest, so which
 * files a damaged shard could have held is decided, not guessed.
 *
 * @param projectRoot - Absolute project root, used as given.
 * @param facts - One read of the store against the current tree.
 * @param collect - Where to hand back the bytes read here. Omit it and nothing
 * is collected; pass it only when the collected bytes will be used against the
 * same tree this call read, since they are a snapshot of that moment.
 * @returns Each scanned path mapped to its state.
 */
export function classifyProjectFacts(
  projectRoot: string,
  facts: ProjectFacts,
  collect?: ClassifiedFileBytes,
): Map<string, FactsFileState> {
  const hashDeclaredInput = createDeclaredInputHasher(projectRoot);
  const states = new Map<string, FactsFileState>();
  const canonicalRoot = canonicalProjectRoot(projectRoot);
  let collected = 0;
  const judgementsUnreadableFor = (path: string): boolean =>
    facts.judgementsDirectoryUnreadable ||
    facts.damagedJudgementShards.has(
      facts.storePaths.shardFileName(facts.storePaths.pathDigest(path)),
    );
  for (const path of facts.scannedPaths) {
    const record = facts.records.get(path)?.record ?? null;
    const openItems = (facts.adjudications.get(path)?.items ?? []).filter(
      (item) => isOpenAdjudication(item.state),
    );
    const current =
      record === null && openItems.length === 0
        ? null
        : hashProjectFile(projectRoot, path, canonicalRoot);
    if (
      collect &&
      current?.ok === true &&
      collected + current.contents.byteLength <= collect.maxTotalBytes
    ) {
      collect.bytes.set(
        pathForCompare(portableResolve(projectRoot, path)),
        current.contents,
      );
      collected += current.contents.byteLength;
    }
    states.set(
      path,
      classifyFactsFile(
        {
          path,
          inScope: facts.scope.covers(path),
          record,
          syntaxValid:
            record !== null &&
            current !== null &&
            current.ok &&
            current.contentHash === record.facts.contentHash,
          resolutionInputsValid:
            record === null ||
            checkDeclaredInputs(record.facts.provenance, hashDeclaredInput).ok,
          hasOpenItems: hasLiveItem(openItems, current),
          judgementsUnreadable: judgementsUnreadableFor(path),
          awaitingReDerivation:
            facts.adjudications.get(path)?.awaitingComparison === true,
          hasPendingAttestation: facts.pending.has(path),
        },
        facts.epoch.resolutionEpoch,
      ),
    );
  }
  return states;
}

/**
 * The canonical location of the project root, for the whole classification.
 * @param projectRoot Absolute project root.
 * @returns Its canonical location, or undefined when it cannot be resolved —
 * then each file resolves it again and reports the failure as its own.
 */
function canonicalProjectRoot(projectRoot: string): string | undefined {
  try {
    return canonicalizeTargetPathSync(projectRoot, projectRoot);
  } catch {
    return undefined;
  }
}

/**
 * Whether any open item still names the lines it was judged on.
 *
 * An item whose judged lines changed has expired: `adjudicate` refuses it and
 * `status` stops listing it, so holding the file uncertain for it would be a
 * state nothing the caller does can clear (P5).
 * @param openItems Items of this file nobody has settled.
 * @param current The file's current digest and bytes, or null when unread.
 * @returns True when at least one of them is still actionable.
 */
function hasLiveItem(
  openItems: readonly AdjudicationItem[],
  current: ProjectFileDigest | null,
): boolean {
  if (current === null || !current.ok) return false;
  return openItems.some(
    (item) =>
      item.lineDigest === computeLineDigest(current.contents, item.reference),
  );
}
