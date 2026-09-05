import { existsSync } from 'node:fs';

import {
  assertNoSymlinkDescendantsSync,
  ensureDirectorySync,
  portableBasename,
  resolveContainedPath,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import type { ReviewUnit } from '../state/reviewGroupTypes.js';

import type { MaterializeUnitDiffsInput } from './reviewUnitDiffTypes.js';

/**
 * Build the stable transient lookup key shared with the chunking phase.
 * @param unit Review unit before or after artifact path assignment.
 * @returns Path-plus-chunk key that cannot collide across one roster.
 */
function unitKey(unit: ReviewUnit): string {
  return `${unit.path}\0${unit.chunk?.index ?? 0}`;
}

/**
 * Build one collision-free group-local unit diff filename.
 * @param unit Review unit whose basename and chunk identity remain visible.
 * @param ordinal One-based unit position inside the group.
 * @returns At-least-two-digit ordinal filename.
 */
function diffFileName(unit: ReviewUnit, ordinal: number): string {
  const chunkSuffix = unit.chunk
    ? `.${unit.chunk.index}-of-${unit.chunk.total}`
    : '';
  return `${String(ordinal).padStart(2, '0')}-${portableBasename(unit.path)}${chunkSuffix}.diff`;
}

/**
 * Materialize contained unit diffs and return groups carrying relative paths.
 * @param input Review root, groups, transient diff bytes, and rewrite policy.
 * @returns Cloned groups whose units carry canonical relative diff paths.
 */
export function materializeUnitDiffs(
  input: MaterializeUnitDiffsInput,
): import('../state/reviewGroupTypes.js').ReviewGroup[] {
  const renderedByUnit = new Map(
    input.renderedUnits.map((rendered) => [unitKey(rendered.unit), rendered]),
  );
  return input.groups.map((group) => ({
    ...group,
    units: group.units.map((unit, index) => {
      const rendered = renderedByUnit.get(unitKey(unit));
      if (!rendered)
        throw new Error(`Missing rendered review unit: ${unit.path}`);
      const diffPath = `diffs/${group.id}/${diffFileName(unit, index + 1)}`;
      const absolutePath = resolveContainedPath(
        input.reviewDirectory,
        diffPath,
      );
      assertNoSymlinkDescendantsSync(input.reviewDirectory, absolutePath);
      ensureDirectorySync(
        resolveContainedPath(input.reviewDirectory, `diffs/${group.id}`),
      );
      if (!input.onlyMissing || !existsSync(absolutePath))
        writeFileAtomicallySync(absolutePath, rendered.diffText);
      return { ...unit, diffPath };
    }),
  }));
}
