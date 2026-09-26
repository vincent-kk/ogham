import { readFileSync } from 'node:fs';

import { validateMetadata } from './validate-metadata.mjs';

/**
 * Read one sidecar and attach its path to any validation failure.
 * @param {string} metadataPath absolute sidecar path
 * @returns {ReturnType<typeof validateMetadata>} canonical metadata
 */
export function readMetadata(metadataPath) {
  try {
    return validateMetadata(JSON.parse(readFileSync(metadataPath, 'utf8')));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid metadata ${metadataPath}: ${message}`);
  }
}
