import type { DateField } from "../../../types/enums.js";
import type { DateSegment } from "../../../types/search.js";
import {
  UID_HARD_CAP,
  MAX_SEGMENT_DEPTH,
  SEGMENT_MAX_BUCKETS,
} from "../../../constants/defaults.js";
import { bucketByDate } from "./bucketByDate.js";
import { probeCount, type CountFn } from "./probeCount.js";

export interface SegmentPlanOptions {
  dateField: DateField;
  from: string;
  to: string;
}

/**
 * Recursively split a query's date range until every bucket is at or under the
 * 10k UID cap (so all UIDs are retrievable) — the core recall guarantee for
 * over-cap queries. Buckets are re-probed via `countFn`; empty buckets are
 * skipped; a bucket still over cap at max depth is returned `capped:true`.
 * Non-overlapping partition ⇒ no loss, no double counting.
 */
export async function planSegments(
  term: string,
  totalCount: number,
  options: SegmentPlanOptions,
  countFn: CountFn,
  depth = 0,
): Promise<DateSegment[]> {
  const { dateField, from, to } = options;

  if (totalCount <= UID_HARD_CAP)
    return [{ field: dateField, from, to, count: totalCount, capped: false }];

  if (depth >= MAX_SEGMENT_DEPTH)
    return [{ field: dateField, from, to, count: totalCount, capped: true }];

  const parts = Math.min(
    Math.ceil(totalCount / UID_HARD_CAP) + 1,
    SEGMENT_MAX_BUCKETS,
  );
  const buckets = bucketByDate(from, to, parts);
  if (buckets.length <= 1)
    return [{ field: dateField, from, to, count: totalCount, capped: true }];

  const segments: DateSegment[] = [];
  for (const bucket of buckets) {
    const count = await probeCount(countFn, term, {
      dateField,
      from: bucket.from,
      to: bucket.to,
    });
    if (count === 0) continue;
    if (count > UID_HARD_CAP)
      segments.push(
        ...(await planSegments(
          term,
          count,
          { dateField, from: bucket.from, to: bucket.to },
          countFn,
          depth + 1,
        )),
      );
    else
      segments.push({
        field: dateField,
        from: bucket.from,
        to: bucket.to,
        count,
        capped: false,
      });
  }
  return segments;
}
