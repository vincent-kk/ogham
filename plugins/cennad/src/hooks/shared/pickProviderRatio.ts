import type { ProviderRatio } from './configTypes.js';
import { isObj } from './isObj.js';

export function pickProviderRatio(
  raw: unknown,
  fallback: ProviderRatio,
): ProviderRatio {
  if (!isObj(raw)) return fallback;
  const rawValue = raw.value;
  const rawEnabled = raw.enabled;
  const value =
    typeof rawValue === 'number' && Number.isFinite(rawValue)
      ? Math.max(0, Math.min(100, Math.round(rawValue)))
      : fallback.value;
  const enabled =
    typeof rawEnabled === 'boolean' ? rawEnabled : fallback.enabled;
  return { value, enabled };
}
