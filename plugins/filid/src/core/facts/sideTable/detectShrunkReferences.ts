import { FACTS_ADJUDICATION_ORIGINS } from '../../../constants/facts.js';
import type { FileFacts } from '../schema/fileFactsSchema.js';

import type { AdjudicationOrigin } from './types/adjudicationTypes.js';

/** One edge a replacement dropped or re-pointed. */
export interface ShrunkReference {
  reference: string;
  kind: FileFacts['references'][number]['kind'];
  /** The in-project path the PREVIOUS record resolved it to. */
  resolvedPath: string;
  origin: AdjudicationOrigin;
}

/** What a replacement is judged against. */
export interface ShrinkInput {
  /** The record being replaced, or null when this file had none. */
  previous: FileFacts | null;
  /** The record replacing it, already accepted. */
  accepted: FileFacts;
  /** Whether both records were accepted at the same resolution epoch. */
  sameEpoch: boolean;
  /**
   * Paths the project currently scans, for judging a vanished target.
   *
   * A re-resolution excuses an edge that moved; it does not excuse one that
   * left the project. When the new record resolves the same string outside the
   * root or nowhere, the question is whether the old target is still there —
   * if it is, the edge did not move, it was dropped.
   */
  scannedPaths?: ReadonlySet<string>;
  /**
   * What to compare against when `previous` is a `toolError` record.
   *
   * Such a record carries no references, so comparing against it excuses every
   * edge the file used to have. The baseline is the last readable record's
   * in-project edges, kept by the store for exactly this moment.
   */
  baseline?: FileFacts['references'];
}

/** Separator that cannot occur in a reference or a kind. */
const KEY_SEPARATOR = String.fromCharCode(0);

/**
 * Find the in-project edges a replacement quietly dropped or re-pointed.
 *
 * Replacement is how a wrong record gets fixed, so it cannot be blocked — but it
 * must not be a way to shrink the graph unobserved. An edge the previous record
 * carried that the new one does not becomes an item somebody has to judge rather
 * than a difference nobody sees (spec §2.4).
 *
 * Two exemptions apply, and each is bounded by what it can explain. A record
 * from the same tool at a NEW epoch is that tool re-resolving a tree that moved,
 * which is the system working: one added sibling legitimately changes what
 * `./util` means. That excuses a re-pointed edge and nothing else — an epoch
 * says where a string resolves, never whether the string is a reference at all,
 * so an edge the new record stops claiming outright is still reported. Nor does
 * it excuse a target that left the project: when the new record resolves the
 * same string outside the root or nowhere while the old target is still a
 * scanned file, nothing moved — the edge was dropped, and that is an item. Without
 * that bound a tool's omission would hide behind any unrelated file being added.
 * And a `toolError` record claims nothing about references at all — a failure to
 * read is not an assertion that there is nothing there — so it leaves the file
 * `tool-error` instead of manufacturing items. Being unable to read is not
 * being able to forget, though: the store keeps the last readable record's
 * edges as `baseline`, and the next record that CAN claim is judged against
 * those. Otherwise a tool that fails once and claims nothing twice drops every
 * edge of a file with nobody to judge it.
 *
 * @param input - The two records and whether the epoch held between them.
 * @returns One entry per dropped or re-pointed in-project edge, keyed by the
 * previous record's resolution, which is the claim being walked back.
 */
export function detectShrunkReferences(input: ShrinkInput): ShrunkReference[] {
  const { previous, accepted, sameEpoch, baseline, scannedPaths } = input;
  if (previous === null || accepted.toolError !== undefined) return [];
  const fromBaseline = previous.toolError !== undefined;
  const claimed = fromBaseline ? (baseline ?? []) : previous.references;
  const toolChanged =
    previous.provenance.tool !== accepted.provenance.tool ||
    previous.provenance.version !== accepted.provenance.version;
  // A baseline outlived the record that produced it, so whose tool wrote it
  // and at which epoch no longer answer for it: the exemption is withheld,
  // which reports more edges rather than fewer.
  const reResolved = !fromBaseline && !sameEpoch && !toolChanged;
  const now = new Map(
    accepted.references.map((reference) => [
      keyOf(reference.kind, reference.sourceText ?? reference.specifier),
      reference,
    ]),
  );
  return claimed.flatMap((reference): ShrunkReference[] => {
    if (!('path' in reference.resolved)) return [];
    const text = reference.sourceText ?? reference.specifier;
    const replacement = now.get(keyOf(reference.kind, text));
    const resolvedPath = reference.resolved.path;
    const target =
      replacement !== undefined && 'path' in replacement.resolved
        ? replacement.resolved.path
        : null;
    if (target === resolvedPath) return [];
    if (replacement !== undefined)
      return reResolved && (target !== null || !scannedPaths?.has(resolvedPath))
        ? []
        : [
            {
              reference: text,
              kind: reference.kind,
              resolvedPath,
              origin: FACTS_ADJUDICATION_ORIGINS.RESOLUTION_CHANGED,
            },
          ];
    return [
      {
        reference: text,
        kind: reference.kind,
        resolvedPath,
        origin: FACTS_ADJUDICATION_ORIGINS.COVERAGE_SHRANK,
      },
    ];
  });
}

/**
 * The identity a reference keeps across a replacement.
 * @param kind Reference kind.
 * @param text `sourceText ?? specifier`.
 * @returns A key combining the two.
 */
function keyOf(kind: string, text: string): string {
  return `${kind}${KEY_SEPARATOR}${text}`;
}
