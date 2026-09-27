import { getDefaultAdapterIds } from '../../../../adapters/index.js';
import { defaultFactsCovers } from '../../../facts/index.js';

import type { FilidConfig } from './configSchemas.js';

export function createDefaultConfig(
  language?: string,
  adapterIds?: string[],
): FilidConfig {
  if (adapterIds?.length === 0)
    throw new Error('explicit adapter mode requires at least one enabled ID');
  return {
    version: '3.0',
    ...(language ? { language } : {}),
    adapters: {
      mode: adapterIds ? 'explicit' : 'auto',
      enabled: adapterIds ?? getDefaultAdapterIds(),
    },
    rules: {},
    facts: { covers: defaultFactsCovers() },
  };
}
