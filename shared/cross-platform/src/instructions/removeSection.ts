import type { SectionMarkers } from "./types.js";

/**
 * The file without its marked section, or null when there was no section to remove —
 * so a caller can tell "nothing to do" from "removed", and skip the write.
 */
export function removeSection(
  source: string,
  markers: SectionMarkers,
): string | null {
  const startIdx = source.indexOf(markers.start);
  const endIdx = source.indexOf(markers.end);
  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return null;

  const before = source.slice(0, startIdx).trimEnd();
  const after = source.slice(endIdx + markers.end.length).trimStart();
  return before + (before && after ? "\n\n" : "") + after;
}
