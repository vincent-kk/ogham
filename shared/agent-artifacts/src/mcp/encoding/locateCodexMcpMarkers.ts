import type { CodexMcpBlockMarkers } from "./codexMcpBlockMarkers.js";

export type CodexMcpMarkerLocation =
  | { readonly ok: true; readonly start: number; readonly end: number }
  | { readonly ok: true; readonly start: null; readonly end: null }
  | { readonly ok: false; readonly reason: string };

export function locateCodexMcpMarkers(
  source: string,
  markers: CodexMcpBlockMarkers,
): CodexMcpMarkerLocation {
  const start = source.indexOf(markers.start);
  const end = source.indexOf(markers.end);
  if (start < 0 && end < 0) return { ok: true, start: null, end: null };
  if (start < 0 || end < 0)
    return { ok: false, reason: "owned MCP block marker is unmatched" };
  if (
    source.indexOf(markers.start, start + markers.start.length) >= 0 ||
    source.indexOf(markers.end, end + markers.end.length) >= 0
  )
    return { ok: false, reason: "owned MCP block marker is duplicated" };
  if (end < start)
    return {
      ok: false,
      reason: "owned MCP block markers are out of order",
    };
  return { ok: true, start, end };
}
