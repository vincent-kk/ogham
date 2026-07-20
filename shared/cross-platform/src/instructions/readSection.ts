import type { SectionMarkers } from "./types.js";

/**
 * The body between the markers, or null when the section is absent.
 *
 * Trimmed, so a round trip through `mergeSection` is stable: that writer trims what it
 * inserts, and re-reading must return what was written or drift detection would see a
 * difference that isn't there.
 */
export function readSection(
  source: string,
  markers: SectionMarkers,
): string | null {
  const startIdx = source.indexOf(markers.start);
  const endIdx = source.indexOf(markers.end);
  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return null;
  return source.slice(startIdx + markers.start.length, endIdx).trim();
}
