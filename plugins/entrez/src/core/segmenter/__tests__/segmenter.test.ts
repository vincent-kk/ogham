import { describe, it, expect } from "vitest";

import { bucketByDate } from "../operations/bucketByDate.js";
import { planSegments } from "../operations/planSegments.js";
import type { CountFn, CountRange } from "../operations/probeCount.js";
import { DateField } from "../../../types/enums.js";
import { UID_HARD_CAP } from "../../../constants/defaults.js";

describe("bucketByDate — complete non-overlapping partition", () => {
  it("splits a year range into contiguous buckets with no gap or overlap", () => {
    const buckets = bucketByDate("2000/01/01", "2000/12/31", 4);
    expect(buckets.length).toBe(4);
    expect(buckets[0].from).toBe("2000/01/01");
    expect(buckets[buckets.length - 1].to).toBe("2000/12/31");
    // each bucket starts the day after the previous ends (no gap/overlap)
    for (let i = 1; i < buckets.length; i++) {
      const prevEnd = new Date(buckets[i - 1].to.replace(/\//g, "-"));
      const curStart = new Date(buckets[i].from.replace(/\//g, "-"));
      expect(curStart.getTime() - prevEnd.getTime()).toBe(24 * 60 * 60 * 1000);
    }
  });

  it("returns a single bucket when it cannot be split (1 day)", () => {
    expect(bucketByDate("2020/05/05", "2020/05/05", 5)).toEqual([
      { from: "2020/05/05", to: "2020/05/05" },
    ]);
  });

  it("normalizes year-only bounds to full-year span", () => {
    const [b] = bucketByDate("1999", "1999", 1);
    expect(b).toEqual({ from: "1999/01/01", to: "1999/12/31" });
  });
});

describe("planSegments — 10k cap, zero loss", () => {
  const opts = {
    dateField: DateField.PUBLICATION,
    from: "2000/01/01",
    to: "2009/12/31",
  };

  it("returns a single segment when under the cap (no probing)", async () => {
    const countFn: CountFn = async () => 0;
    const segments = await planSegments("cancer", 500, opts, countFn);
    expect(segments).toEqual([
      {
        field: DateField.PUBLICATION,
        from: opts.from,
        to: opts.to,
        count: 500,
        capped: false,
      },
    ]);
  });

  const DAY = 24 * 60 * 60 * 1000;
  const fullFrom = Date.parse("2000-01-01");
  const fullTo = Date.parse("2009-12-31");
  const fullDays = (fullTo - fullFrom) / DAY + 1;

  /** Count proportional to a bucket's day-span (realistic, self-consistent). */
  function proportionalCount(total: number): CountFn {
    return async (_term: string, range?: CountRange) => {
      if (!range) return total;
      const f = Date.parse(range.from.replace(/\//g, "-"));
      const t = Date.parse(range.to.replace(/\//g, "-"));
      return Math.round((total * ((t - f) / DAY + 1)) / fullDays);
    };
  }

  it("splits an over-cap query so every segment is at or under the cap", async () => {
    const segments = await planSegments(
      "cancer",
      60_000,
      opts,
      proportionalCount(60_000),
    );
    expect(segments.length).toBeGreaterThan(1);
    expect(segments.every((s) => s.count <= UID_HARD_CAP)).toBe(true);
    expect(segments.every((s) => !s.capped)).toBe(true);
  });

  it("recurses across levels and conserves the total (zero loss)", async () => {
    const total = 200_000;
    const segments = await planSegments(
      "cancer",
      total,
      opts,
      proportionalCount(total),
    );
    expect(segments.every((s) => s.count <= UID_HARD_CAP)).toBe(true);
    expect(segments.every((s) => !s.capped)).toBe(true);
    const sum = segments.reduce((acc, s) => acc + s.count, 0);
    // Non-overlapping full partition ⇒ sum ≈ total (rounding within bucket count).
    expect(Math.abs(sum - total)).toBeLessThan(segments.length + 1);
  });

  it("marks a single-day range that is still over cap as capped", async () => {
    const oneDay = {
      dateField: DateField.PUBLICATION,
      from: "2020/05/05",
      to: "2020/05/05",
    };
    const countFn: CountFn = async () => 50_000;
    const segments = await planSegments("cancer", 50_000, oneDay, countFn);
    expect(segments).toEqual([
      {
        field: DateField.PUBLICATION,
        from: "2020/05/05",
        to: "2020/05/05",
        count: 50_000,
        capped: true,
      },
    ]);
  });

  it("stops at max recursion depth and marks the bucket capped (no infinite loop)", async () => {
    const countFn: CountFn = async () => 1_000_000; // never resolves under cap
    const segments = await planSegments("cancer", 1_000_000, opts, countFn);
    expect(segments.length).toBeGreaterThan(0);
    expect(segments.some((s) => s.capped)).toBe(true);
  });

  it("skips empty buckets (count 0)", async () => {
    let n = 0;
    const countFn: CountFn = async () => {
      n += 1;
      return n === 1 ? 5_000 : 0;
    };
    const segments = await planSegments("rare", 60_000, opts, countFn);
    expect(segments.length).toBe(1);
    expect(segments[0].count).toBe(5_000);
  });
});
