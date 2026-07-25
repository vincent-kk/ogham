import type { CodexMcpBlockMarkers } from "./codexMcpBlockMarkers.js";
import { locateCodexMcpMarkers } from "./locateCodexMcpMarkers.js";
import { resolveCodexMcpBlockEnd } from "./resolveCodexMcpBlockEnd.js";
import { validateCodexMcpMarkerLines } from "./validateCodexMcpMarkerLines.js";

export type CodexMcpBlockSearch =
  | {
      readonly ok: true;
      readonly range: {
        readonly start: number;
        readonly end: number;
        readonly content: string;
      } | null;
    }
  | { readonly ok: false; readonly reason: string };

export function findCodexMcpBlock(
  source: string,
  markers: CodexMcpBlockMarkers,
): CodexMcpBlockSearch {
  const location = locateCodexMcpMarkers(source, markers);
  if (!location.ok) return location;
  if (location.start === null) return { ok: true, range: null };
  const lineError = validateCodexMcpMarkerLines(
    source,
    markers,
    location.start,
    location.end,
  );
  if (lineError !== null) return { ok: false, reason: lineError };
  const blockEnd = resolveCodexMcpBlockEnd(source, markers, location.end);
  if (!blockEnd.ok) return blockEnd;

  return {
    ok: true,
    range: {
      start: location.start,
      end: blockEnd.end,
      content: source.slice(location.start, blockEnd.end),
    },
  };
}
