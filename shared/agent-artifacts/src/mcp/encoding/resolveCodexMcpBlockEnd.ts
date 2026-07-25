import type { CodexMcpBlockMarkers } from "./codexMcpBlockMarkers.js";

export type CodexMcpBlockEnd =
  | { readonly ok: true; readonly end: number }
  | { readonly ok: false; readonly reason: string };

export function resolveCodexMcpBlockEnd(
  source: string,
  markers: CodexMcpBlockMarkers,
  markerStart: number,
): CodexMcpBlockEnd {
  const markerEnd = markerStart + markers.end.length;
  if (source.slice(markerEnd, markerEnd + 2) === "\r\n")
    return { ok: true, end: markerEnd + 2 };
  if (source[markerEnd] === "\n") return { ok: true, end: markerEnd + 1 };
  if (markerEnd === source.length) return { ok: true, end: markerEnd };
  return {
    ok: false,
    reason: "owned MCP block end marker is malformed",
  };
}
