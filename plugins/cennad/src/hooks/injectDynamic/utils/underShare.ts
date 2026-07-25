export interface RatioLane {
  name: string;
  count: number;
  // Configured ratio weight (the raw percent), 0 when the provider is disabled.
  weight: number;
  // Whether hooks may elect this provider. Providers reserved for crosscheck
  // are reported in the counts but never listed as under share — nothing should
  // dispatch to close a gap that auto-routing cannot close.
  electable: boolean;
}

// Condenses current/target/drift into the one fact a turn can read: which
// electable providers sit below their configured share, in percentage points.
// Returns '' when none do, so the caller can drop the segment entirely.
export function underShare(lanes: readonly RatioLane[]): string {
  const total = lanes.reduce((sum, lane) => sum + lane.count, 0);
  const under = lanes
    .filter((lane) => lane.electable)
    .map((lane) => ({
      name: lane.name,
      gap:
        lane.weight -
        (total === 0 ? 0 : Math.round((lane.count / total) * 100)),
    }))
    .filter((lane) => lane.gap > 0)
    .sort((a, b) => b.gap - a.gap);

  if (under.length === 0) return '';
  return `under share: ${under
    .map((lane) => `${lane.name} ${lane.gap}pt`)
    .join(' · ')}`;
}
