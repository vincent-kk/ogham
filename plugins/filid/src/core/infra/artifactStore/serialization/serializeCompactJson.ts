import { TOOL_SERIALIZATION_ERROR_MESSAGE } from '../../../../constants/toolEnvelope.js';

function normalizeCollection(_key: string, value: unknown): unknown {
  if (value instanceof Map) return Object.fromEntries(value);
  if (value instanceof Set) return [...value];
  return value;
}

export function serializeCompactJson(value: unknown): string {
  const serialized = JSON.stringify(value, normalizeCollection);
  if (serialized === undefined)
    throw new Error(TOOL_SERIALIZATION_ERROR_MESSAGE);
  return serialized;
}
