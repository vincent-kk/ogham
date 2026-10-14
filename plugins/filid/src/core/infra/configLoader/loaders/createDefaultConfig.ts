import { getDefaultAdapterIds } from '../../../../adapters/index.js';
import { DEFAULT_VERIFICATION_ORGAN_NAMES } from '../../../../constants/organNames.js';
import { defaultFactsCovers } from '../../../facts/index.js';

import type { FilidConfig } from './configSchemas.js';

/**
 * Create a complete default configuration without writing it.
 * @param language Optional document output language.
 * @param adapterIds Non-empty explicit adapter IDs, or automatic selection when absent.
 * @returns Default v3 configuration including verification directory names.
 * @throws When explicit adapter IDs are empty.
 */
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
    verification: { organNames: [...DEFAULT_VERIFICATION_ORGAN_NAMES] },
  };
}
