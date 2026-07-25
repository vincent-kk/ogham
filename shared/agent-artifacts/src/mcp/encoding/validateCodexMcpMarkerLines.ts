import type { CodexMcpBlockMarkers } from "./codexMcpBlockMarkers.js";

export function validateCodexMcpMarkerLines(
  source: string,
  markers: CodexMcpBlockMarkers,
  start: number,
  end: number,
): string | null {
  const afterStart = start + markers.start.length;
  if (
    (start > 0 && source[start - 1] !== "\n") ||
    (source[afterStart] !== "\n" &&
      source.slice(afterStart, afterStart + 2) !== "\r\n")
  )
    return "owned MCP block start marker is malformed";
  return source[end - 1] === "\n"
    ? null
    : "owned MCP block end marker is malformed";
}
