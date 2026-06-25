import type { PaperRecord } from "../../../types/record.js";
import type { UnionResult } from "../../../types/search.js";
import { dedupKey } from "./dedupKey.js";
import { tagHitBy } from "./tagHitBy.js";

/**
 * Deterministically merge records from multiple queries into a unique union by
 * composite key (PMID → DOI → normalized title), accumulating recall
 * attribution. This — not the LLM — guarantees zero loss across queries.
 * Insertion order of first occurrence is preserved.
 */
export function mergeRecords(records: PaperRecord[]): UnionResult {
  const map = new Map<string, PaperRecord>();
  let collisions = 0;

  for (const record of records) {
    const key = dedupKey(record);
    const existing = map.get(key);
    if (existing) {
      map.set(key, tagHitBy(existing, record));
      collisions += 1;
    } else {
      map.set(key, {
        ...record,
        hit_by: [...record.hit_by],
        query_role: [...record.query_role],
      });
    }
  }

  return {
    records: [...map.values()],
    total_unique: map.size,
    dedup_collisions: collisions,
  };
}
