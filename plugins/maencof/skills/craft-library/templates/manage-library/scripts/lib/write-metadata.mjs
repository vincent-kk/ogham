import { writeFileSync } from 'node:fs';

import { validateMetadata } from './validate-metadata.mjs';

/**
 * Validate and persist one canonical sidecar with stable formatting.
 * @param {string} metadataPath absolute destination path
 * @param {unknown} metadata candidate metadata
 * @returns {ReturnType<typeof validateMetadata>} persisted metadata
 */
export function writeMetadata(metadataPath, metadata) {
  const validated = validateMetadata(metadata);
  writeFileSync(
    metadataPath,
    `${JSON.stringify(validated, null, 2)}\n`,
    'utf8',
  );
  return validated;
}
