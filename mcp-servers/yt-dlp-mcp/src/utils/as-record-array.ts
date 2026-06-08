import { asArray } from './as-array.js';
import { asRecord } from './as-record.js';

/** Maps an unknown[] to records, dropping non-object entries (type-narrowing). */
export function asRecordArray(value: unknown): Record<string, unknown>[] {
  return asArray(value).flatMap((item) => {
    const record = asRecord(item);
    return record ? [record] : [];
  });
}
