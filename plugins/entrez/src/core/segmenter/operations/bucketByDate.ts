/** A contiguous inclusive date range (YYYY/MM/DD). */
export interface DateBucket {
  from: string;
  to: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Parse "YYYY", "YYYY/MM", or "YYYY/MM/DD" (or with "-") into a UTC Date. */
function parseDate(value: string, isEnd: boolean): Date {
  const [y, m, d] = value.split(/[/-]/).map(Number);
  const month = m ?? (isEnd ? 12 : 1);
  const day = d ?? (isEnd ? daysInMonth(y, month) : 1);
  return new Date(Date.UTC(y, month - 1, day));
}

function formatDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

/**
 * Split an inclusive date range into up to `parts` contiguous, non-overlapping
 * sub-ranges that fully cover [from, to]. Non-overlapping partition ⇒ no record
 * is double-counted or lost across buckets. Returns a single bucket when the
 * range cannot be split further (≤ 1 day or parts ≤ 1).
 */
export function bucketByDate(
  from: string,
  to: string,
  parts: number,
): DateBucket[] {
  const start = parseDate(from, false);
  const end = parseDate(to, true);
  const startMs = start.getTime();
  const endMs = end.getTime();

  if (parts <= 1 || endMs <= startMs) {
    return [{ from: formatDate(start), to: formatDate(end) }];
  }

  const totalDays = Math.floor((endMs - startMs) / DAY_MS) + 1;
  const effectiveParts = Math.min(parts, totalDays);
  const perBucket = Math.ceil(totalDays / effectiveParts);

  const buckets: DateBucket[] = [];
  let cursor = startMs;
  while (cursor <= endMs) {
    const bucketEnd = Math.min(cursor + (perBucket - 1) * DAY_MS, endMs);
    buckets.push({
      from: formatDate(new Date(cursor)),
      to: formatDate(new Date(bucketEnd)),
    });
    cursor = bucketEnd + DAY_MS;
  }
  return buckets;
}
