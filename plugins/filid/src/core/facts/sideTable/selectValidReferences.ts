import { FACTS_ADJUDICATION_STATES } from '../../../constants/facts.js';

import type { AdjudicationPage } from './adjudicationTableSchema.js';

/** One edge a file is held to carry. */
export interface ValidReference {
  /** Project-relative POSIX path of the file the reference sits in. */
  path: string;
  /** Project-relative POSIX path the reference resolves to. */
  resolvedPath: string;
}

/**
 * The edges a file is judged to carry: its record's, plus the adopted ones.
 *
 * Union, never override. An adopted edge is added to what the record says
 * rather than replacing it, so the same string may legitimately carry a record's
 * resolution and an adopted one at once — an error in the widening direction,
 * which shows up as a false finding rather than a hidden violation (spec §4.5).
 *
 * A pending dismissal contributes nothing yet and a confirmed one contributes
 * nothing ever; an adopted edge under re-adjudication still counts until that
 * dismissal is confirmed.
 *
 * @param recordEdges - Resolved in-project paths the stored record carries.
 * @param page - That file's side-table page, or undefined when it has none.
 * @param path - Project-relative path of the file these edges leave.
 * @returns Every edge, deduplicated and sorted by target.
 */
export function selectValidReferences(
  recordEdges: readonly string[],
  page: AdjudicationPage | undefined,
  path: string,
): ValidReference[] {
  const targets = new Set(recordEdges);
  for (const item of page?.items ?? [])
    if (item.state === FACTS_ADJUDICATION_STATES.ADOPTED)
      targets.add(item.resolvedPath);
  return [...targets]
    .sort((left, right) => left.localeCompare(right))
    .map((resolvedPath) => ({ path, resolvedPath }));
}
