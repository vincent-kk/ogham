import type { ProviderRatio } from './configTypes.js';
import { isPlainObject } from './isPlainObject.js';

export function pickProviderRatio(
  raw: unknown,
  fallback: ProviderRatio,
): ProviderRatio {
  if (!isPlainObject(raw)) return fallback;
  const rawValue = raw.value;
  const rawEnabled = raw.enabled;
  const value =
    typeof rawValue === 'number' && Number.isFinite(rawValue)
      ? Math.max(0, Math.min(100, Math.round(rawValue)))
      : fallback.value;
  const enabled =
    typeof rawEnabled === 'boolean' ? rawEnabled : fallback.enabled;
  const rawCrosscheckOnly = raw.crosscheck_only;
  const crosscheck_only =
    typeof rawCrosscheckOnly === 'boolean'
      ? rawCrosscheckOnly
      : fallback.crosscheck_only;
  return crosscheck_only === undefined
    ? { value, enabled }
    : { value, enabled, crosscheck_only };
}
