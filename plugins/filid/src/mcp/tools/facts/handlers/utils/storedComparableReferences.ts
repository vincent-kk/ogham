import type {
  AdjudicationPage,
  ComparableReference,
} from '../../../../../core/facts/index.js';

import type { buildFactsContext } from './buildFactsContext.js';

/**
 * The edges the store currently holds for one file: its record plus adopted.
 *
 * An adopted item is an edge an actor put back after a tool missed it, so a
 * comparison that read the record alone would report it missing on every run
 * and ask for the same judgement again.
 *
 * @param context - Store contents for this call.
 * @param path - Project-relative path of the file.
 * @param page - That file's side-table page, if any.
 * @returns Comparable references for everything the store stands behind.
 */
export function storedComparableReferences(
  context: Awaited<ReturnType<typeof buildFactsContext>>,
  path: string,
  page: AdjudicationPage | undefined,
): ComparableReference[] {
  const record = context.records.get(path)?.record;
  return (record?.facts.references ?? [])
    .map(
      (reference): ComparableReference => ({
        reference: reference.sourceText ?? reference.specifier,
        kind: reference.kind,
        resolvedPath:
          'path' in reference.resolved ? reference.resolved.path : null,
      }),
    )
    .concat(
      (page?.items ?? [])
        .filter((item) => item.state === 'adopted')
        .map((item) => ({
          reference: item.reference,
          kind: item.kind,
          resolvedPath: item.resolvedPath,
        })),
    );
}
