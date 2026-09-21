/**
 * Analysis axes a diagnostic can declare in `affects`: the conclusions it can
 * change. Entry-point, node and document rules have no axis of their own and
 * are expressed through `boundaries`.
 */
export const ANALYSIS_AXES = [
  'dependencies',
  'boundaries',
  'verification',
] as const;
