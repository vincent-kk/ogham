import { DEFAULT_CONFIG } from '../../../constants/defaults.js';

import { isPlainObject } from './isPlainObject.js';

export function mergeArtifacts(raw: unknown): {
  enabled: boolean;
  location: 'project' | 'user';
} {
  const defaults = DEFAULT_CONFIG.artifacts;
  if (!isPlainObject(raw)) return { ...defaults };
  const enabled =
    typeof raw.enabled === 'boolean' ? raw.enabled : defaults.enabled;
  const location =
    raw.location === 'project' || raw.location === 'user'
      ? raw.location
      : defaults.location;
  return { enabled, location };
}
