import { selectValidReferences } from '../../../../../core/facts/index.js';
import type { ProjectFacts } from '../../../../../core/facts/index.js';
import type { NormalizedFileFacts } from '../../../../../types/fractal.js';

/**
 * Edges that entered or left one file's valid references since the freeze.
 *
 * Both directions are the same mistake: an edge added since the freeze was
 * never read, and one removed since is a conclusion resting on something that
 * is no longer there.
 *
 * @param facts - One read of the live store.
 * @param entry - The file's frozen facts, as prepare wrote them.
 * @returns Reference text and message per differing edge, target order; empty
 * when the live valid references are exactly the frozen ones.
 */
export function collectChangedFrozenEdges(
  facts: ProjectFacts,
  entry: NormalizedFileFacts,
): [string, string][] {
  const page = facts.adjudications.get(entry.path);
  // Reference text per target, so a refusal about an edge can be located in
  // the source: the resolved path is not what the file says, and looking for
  // it there finds nothing and drops the line number.
  const textByTarget = new Map<string, string>();
  const recordEdges: string[] = [];
  for (const reference of facts.records.get(entry.path)?.record.facts
    .references ?? [])
    if ('path' in reference.resolved) {
      recordEdges.push(reference.resolved.path);
      textByTarget.set(
        reference.resolved.path,
        reference.sourceText ?? reference.specifier,
      );
    }
  // Items contribute text, never edges: which of them carries an edge is
  // `selectValidReferences`' rule, and a dismissed one carries none.
  for (const item of page?.items ?? [])
    if (!textByTarget.has(item.resolvedPath))
      textByTarget.set(item.resolvedPath, item.reference);
  const live = new Set(
    selectValidReferences(recordEdges, page, entry.path).map(
      ({ resolvedPath }) => resolvedPath,
    ),
  );
  const frozen = new Map(
    entry.references.map(({ resolvedPath, reference }) => [
      resolvedPath,
      reference,
    ]),
  );
  return [
    ...[...live]
      .filter((target) => !frozen.has(target))
      .map((target): [string, string] => [
        textByTarget.get(target) ?? target,
        `${entry.path} is now judged to reference ${target}, but this review was judged without that edge.`,
      ]),
    ...[...frozen]
      .filter(([target]) => !live.has(target))
      .map(([target, reference]): [string, string] => [
        reference,
        `${entry.path} was judged on a reference to ${target} that its valid references no longer carry.`,
      ]),
  ];
}
