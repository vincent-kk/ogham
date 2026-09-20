import {
  FACTS_ADJUDICATION_ORIGINS,
  FACTS_ADJUDICATION_STATES,
} from '../../../../../constants/facts.js';
import {
  computeLineDigest,
  detectShrunkReferences,
  isOpenAdjudication,
  locateSourceText,
} from '../../../../../core/facts/index.js';
import type {
  AdjudicationItem,
  AdjudicationPageUpdate,
  AdjudicationTableContents,
  FileFacts,
  ProjectFileDigest,
} from '../../../../../core/facts/index.js';

/** Separator that cannot occur in a reference, a kind or a path. */
const KEY_SEPARATOR = String.fromCharCode(0);

/**
 * The identity an edge keeps across a replacement.
 * @param kind Reference kind.
 * @param reference `sourceText ?? specifier`.
 * @param resolvedPath In-project target of the edge.
 * @returns A key combining the three.
 */
function edgeKey(kind: string, reference: string, resolvedPath: string): string {
  return [kind, reference, resolvedPath].join(KEY_SEPARATOR);
}

/** What two attesters already agreed about, when this record is their record. */
export interface AgreedNonReferences {
  /** Lines both attesters read as non-references, mapped to the reason. */
  nonReferences: ReadonlyMap<number, string>;
  /** The actor that held the first attestation. */
  actor: string;
}

/** One file's page after a replacement, and what the replacement did to it. */
export interface SubmitSideTablePlan extends AdjudicationPageUpdate {
  /** Edges the replacement walked back, now awaiting judgement. */
  opened: number;
  /** Items the new record settled by carrying the edge after all. */
  closedByRecord: number;
  /** Edges two attesters had already put down, recorded as dismissed. */
  dismissedByAttesters: number;
}

/**
 * Work out one file's page after a replacement, without writing anything.
 *
 * Four rules meet here, and each is the side table doing its job.
 *
 * An item whose judged lines have changed expires. An item still awaiting a
 * decision whose edge the new record carries closes — submitting a better record
 * is a legitimate way to settle a question nobody has answered yet. A judgement
 * already made is left standing instead: closing an adopted item would drop the
 * adopted edge the moment a record carried it, and the next record to walk that
 * edge back would find nothing to reopen, so one actor's adoption would be
 * erased by two ordinary submissions. An edge the replacement walked back opens an item, so
 * a narrowing submission cannot pass unobserved. And a closed item whose edge is
 * walked back AGAIN reopens in place: without that, two ordinary submissions —
 * one carrying the edge, one dropping it — would retire a real import for good,
 * which is the precise hole the table exists to close.
 *
 * Whether an edge was really walked back is decided by counting, because a file
 * may hold the same specifier twice — a type-only import beside a value one —
 * and deleting one of them is an ordinary edit, not a claim worth two actors.
 * Two counts together decide it, and an item opens when either says so:
 *
 * - the string appears on more lines than the new record accounts for, so
 *   something in the file is unexplained (at most one item per such occurrence);
 * - or the record claims that string exactly as many times as the previous one
 *   did, so nothing was deleted and a target that moved is a real contradiction.
 *
 * Neither test alone is enough: occurrences miss a straight re-point, where the
 * claim count is unchanged, and claim counts miss a record that drops one of two
 * live imports.
 *
 * @param table - The side table as this call read it.
 * @param key - Digest of the file's project-relative path.
 * @param previous - The record being replaced, or null when there was none.
 * @param accepted - The record that replaced it.
 * @param current - The file's current digest and bytes.
 * @param sameEpoch - Whether both records were accepted at the same epoch.
 * @param attested - What two attesters agreed about, when this record is the
 * one their agreement confirmed. An edge it drops whose every occurrence sits
 * on a line both of them called a non-reference is recorded as `dismissed`
 * rather than opened: the same two pairs of eyes already read those lines, and
 * asking two more to repeat the reading is the ceremony twice.
 * @returns The page this file should end up with, and the counts to report.
 */
export function planSideTableForSubmit(
  table: AdjudicationTableContents,
  key: string,
  previous: FileFacts | null,
  accepted: FileFacts,
  current: Extract<ProjectFileDigest, { ok: true }>,
  sameEpoch: boolean,
  attested?: AgreedNonReferences,
): SubmitSideTablePlan {
  const lines = current.contents.toString('utf8').split(/\r\n|\r|\n/);
  const carried = new Set(
    accepted.references.flatMap((reference) =>
      'path' in reference.resolved
        ? [
            edgeKey(
              reference.kind,
              reference.sourceText ?? reference.specifier,
              reference.resolved.path,
            ),
          ]
        : [],
    ),
  );
  let closedByRecord = 0;
  const items = (table.pages.get(key)?.items ?? [])
    .filter(
      (item) =>
        item.lineDigest === computeLineDigest(current.contents, item.reference),
    )
    .map((item): AdjudicationItem => {
      if (
        !isOpenAdjudication(item.state) ||
        !carried.has(edgeKey(item.kind, item.reference, item.resolvedPath))
      )
        return item;
      closedByRecord += 1;
      return { ...item, state: FACTS_ADJUDICATION_STATES.CLOSED_BY_RECORD };
    });
  const budget = new Map<string, number>();
  let opened = 0;
  let dismissedByAttesters = 0;
  const claimCount = (facts: FileFacts | null, reference: string): number =>
    (facts?.references ?? []).filter(
      (candidate) => (candidate.sourceText ?? candidate.specifier) === reference,
    ).length;
  for (const shrunk of detectShrunkReferences({
    previous,
    accepted,
    sameEpoch,
  })) {
    const remaining =
      budget.get(shrunk.reference) ??
      unaccountedOccurrences(lines, accepted, shrunk.reference);
    if (remaining > 0) budget.set(shrunk.reference, remaining - 1);
    else if (
      claimCount(previous, shrunk.reference) !==
      claimCount(accepted, shrunk.reference)
    )
      continue;
    const at = items.findIndex(
      (item) =>
        item.kind === shrunk.kind &&
        item.reference === shrunk.reference &&
        item.resolvedPath === shrunk.resolvedPath,
    );
    const occurrences = locateSourceText(lines, shrunk.reference);
    const settled =
      attested !== undefined &&
      occurrences.length > 0 &&
      occurrences.every((line) => attested.nonReferences.has(line));
    const reopened: AdjudicationItem = {
      path: accepted.path,
      kind: shrunk.kind,
      reference: shrunk.reference,
      resolvedPath: shrunk.resolvedPath,
      origin: settled
        ? FACTS_ADJUDICATION_ORIGINS.ATTESTED_NON_REFERENCE
        : shrunk.origin,
      state: settled
        ? FACTS_ADJUDICATION_STATES.DISMISSED
        : FACTS_ADJUDICATION_STATES.UNADJUDICATED,
      lineDigest: computeLineDigest(current.contents, shrunk.reference),
      contentHash: current.contentHash,
      ...(settled
        ? {
            actor: (attested as AgreedNonReferences).actor,
            reason: (attested as AgreedNonReferences).nonReferences.get(
              occurrences[0] as number,
            ) as string,
          }
        : {}),
    };
    if (at === -1) {
      items.push(reopened);
      if (settled) dismissedByAttesters += 1;
      else opened += 1;
      continue;
    }
    if (items[at]?.state !== FACTS_ADJUDICATION_STATES.CLOSED_BY_RECORD)
      continue;
    items[at] = reopened;
    if (settled) dismissedByAttesters += 1;
    else opened += 1;
  }
  return {
    path: accepted.path,
    items,
    opened,
    closedByRecord,
    dismissedByAttesters,
  };
}

/**
 * How many times a string appears beyond what the new record accounts for.
 * @param lines The file's current contents, split into lines.
 * @param accepted The record that replaced the previous one.
 * @param reference `sourceText ?? specifier` of the walked-back edge.
 * @returns Occurrences the record does not claim; zero or less opens nothing.
 */
function unaccountedOccurrences(
  lines: readonly string[],
  accepted: FileFacts,
  reference: string,
): number {
  const present = locateSourceText(lines, reference).length;
  const claimed = accepted.references.filter(
    (candidate) => (candidate.sourceText ?? candidate.specifier) === reference,
  ).length;
  return present - claimed;
}
