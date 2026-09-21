import type { AnalysisAxis } from '../../../types/fractal.js';

/**
 * Whether a diagnostic can change a conclusion on any of the given axes.
 *
 * The decision reads whether the `affects` key is present, not the array's
 * length: a producer's `affects: []` changes no conclusion, while a stored
 * diagnostic persisted before producers declared impact has no key and counts
 * against every axis.
 * @param diagnostic Diagnostic as produced or as persisted in review state.
 * @param axes Axes the caller's conclusion rests on.
 * @returns True when `affects` is absent or names one of `axes`.
 */
export function affectsAnalysisAxis(
  diagnostic: { readonly affects?: readonly AnalysisAxis[] },
  axes: readonly AnalysisAxis[],
): boolean {
  return (
    diagnostic.affects === undefined ||
    diagnostic.affects.some((axis) => axes.includes(axis))
  );
}
