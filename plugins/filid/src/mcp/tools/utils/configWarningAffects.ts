import { ANALYSIS_AXES } from '../../../constants/analysisAxes.js';
import { LOOSEN_ONLY_CONFIG_PATHS } from '../../../constants/configWarningAxes.js';
import type { ConfigWarning } from '../../../core/index.js';
import type { AnalysisAxis } from '../../../types/fractal.js';

/**
 * The analysis axes a skipped config entry could have changed.
 * @param key Config path of the dropped entry, or `null` for a whole-config fallback.
 * @returns `[]` for a path under `LOOSEN_ONLY_CONFIG_PATHS`, every axis otherwise.
 */
export function configWarningAffects(
  key: ConfigWarning['key'],
): readonly AnalysisAxis[] {
  const loosenOnly =
    key !== null &&
    LOOSEN_ONLY_CONFIG_PATHS.some(
      (pattern) =>
        pattern.length <= key.length &&
        pattern.every(
          (segment, index) => segment === '*' || segment === String(key[index]),
        ),
    );
  return loosenOnly ? [] : ANALYSIS_AXES;
}
