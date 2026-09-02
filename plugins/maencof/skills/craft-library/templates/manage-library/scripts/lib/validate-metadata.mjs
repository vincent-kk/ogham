import { normalizeValues } from './normalize-values.mjs';

const METADATA_KEYS = [
  'schemaVersion',
  'name',
  'createdAt',
  'tags',
  'searchTerms',
];

/**
 * Validate and normalize one canonical article sidecar.
 * @param {unknown} value parsed JSON data
 * @returns {{schemaVersion: 1, name: string, createdAt: string, tags: string[], searchTerms: string[]}} metadata
 */
export function validateMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Metadata must be a JSON object');
  }
  const keys = Object.keys(value).sort();
  if (JSON.stringify(keys) !== JSON.stringify([...METADATA_KEYS].sort())) {
    throw new Error(
      `Metadata keys must be exactly: ${METADATA_KEYS.join(', ')}`,
    );
  }
  if (value.schemaVersion !== 1) throw new Error('schemaVersion must be 1');
  if (typeof value.name !== 'string' || !value.name.trim()) {
    throw new Error('name must be a non-empty string');
  }
  if (
    typeof value.createdAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T/.test(value.createdAt) ||
    !Number.isFinite(Date.parse(value.createdAt))
  ) {
    throw new Error('createdAt must be an ISO-8601 timestamp');
  }
  return {
    schemaVersion: 1,
    name: value.name.trim(),
    createdAt: value.createdAt,
    tags: normalizeValues(value.tags),
    searchTerms: normalizeValues(value.searchTerms),
  };
}
