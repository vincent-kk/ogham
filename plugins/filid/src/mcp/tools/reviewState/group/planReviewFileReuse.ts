import type { ReviewGroupArtifactStatus } from '../handoff/handoffTypes.js';
import type { ReviewGroup } from '../state/reviewGroupTypes.js';
import type { ReviewReuseReason } from '../state/reviewIncrementalTypes.js';
import type { ReviewStateRecord } from '../state/reviewStateTypes.js';

import { resolveReviewReuseReasons } from './resolveReviewReuseReasons.js';

/**
 * Select unchanged files independently of the groups that originally reviewed them.
 * @param state Current committed scope and file input observations.
 * @param previous Previous generation with validated original file results.
 * @param statuses Observed artifact trust for every previous group.
 * @param renames Git's previous-to-current rename pairs.
 * @returns Retained group projections and only the files requiring additional review.
 */
export function planReviewFileReuse(
  state: ReviewStateRecord,
  previous: ReviewStateRecord | null,
  statuses: readonly ReviewGroupArtifactStatus[],
  renames: ReadonlyMap<string, string>,
): {
  retained: ReviewGroup[];
  selectedPaths: string[];
  reasons: Record<string, ReviewReuseReason[]>;
} {
  const current = Object.assign(
    {},
    ...state.groups.map((group) => group.fileInputs ?? {}),
  );
  const reasons: Record<string, ReviewReuseReason[]> = {};
  const retainedPaths = new Map<string, string>();
  const oldPaths = new Set(
    previous?.groups.flatMap((group) => group.units.map((unit) => unit.path)) ??
      [],
  );
  for (const oldPath of oldPaths) {
    const path = renames.get(oldPath) ?? oldPath;
    const groups = previous!.groups.filter((group) =>
      group.units.some((unit) => unit.path === oldPath),
    );
    if (!current[path]) continue;
    reasons[path] = [
      ...new Set(
        groups.flatMap((group) =>
          resolveReviewReuseReasons(
            current[path],
            group.fileInputs?.[oldPath],
            Boolean(
              group.validated.review?.complete &&
              statuses.some(
                (status) =>
                  status.group === group.id &&
                  status.review === 'trusted' &&
                  status.verify === 'trusted',
              ),
            ),
          ),
        ),
      ),
    ];
    if (reasons[path].length === 0) retainedPaths.set(oldPath, path);
  }
  const retained: ReviewGroup[] = [];
  for (const origin of previous?.groups ?? []) {
    const units = origin.units.filter((unit) => retainedPaths.has(unit.path));
    if (units.length === 0) continue;
    const paths = Object.fromEntries(
      units.map((unit) => [unit.path, retainedPaths.get(unit.path)!]),
    );
    retained.push({
      ...origin,
      units: units.map((unit) => ({ ...unit, path: paths[unit.path] })),
      fileInputs: Object.fromEntries(
        units.map((unit) => [paths[unit.path], current[paths[unit.path]]]),
      ),
      opinionUnits: origin.opinionUnits ?? origin.units,
      opinionPaths: Object.fromEntries(
        Object.entries(
          origin.opinionPaths ??
            Object.fromEntries(
              origin.units.map((unit) => [unit.path, unit.path]),
            ),
        )
          .filter(([, path]) => paths[path] !== undefined)
          .map(([original, path]) => [original, paths[path]]),
      ),
      dependsOn: [],
      reusedFrom: {
        stateHash: '',
        sourceHash: origin.reusedFrom?.sourceHash ?? previous!.sourceHash,
        inputHash: origin.input!.preparedInputHash,
        paths,
      },
    });
  }
  const kept = new Set(retainedPaths.values());
  return {
    retained,
    selectedPaths: state.scope.files
      .filter((file) => !kept.has(file.path))
      .map((file) => file.path),
    reasons,
  };
}
