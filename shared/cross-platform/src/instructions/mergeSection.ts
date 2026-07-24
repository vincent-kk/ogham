import type { SectionMarkers } from "./types.js";

/**
 * Insert or replace one marked section, preserving everything outside it.
 *
 * Idempotent: merging the same body twice yields the same string, because an existing
 * span is replaced in place rather than appended to. That is what makes re-running the
 * setup skill safe — without it, `AGENTS.md` would accumulate a copy of every rule
 * document on every run.
 *
 * Pure: the caller owns the file I/O (filid writes atomically, maencof keeps a `.bak`),
 * and staying free of `node:fs` is what lets hook bundles import this.
 */
export function mergeSection(
  source: string,
  markers: SectionMarkers,
  body: string,
): string {
  const block = [markers.start, body.trim(), markers.end].join("\n");

  const startIdx = source.indexOf(markers.start);
  const endIdx = source.indexOf(markers.end);
  if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx)
    return (
      source.slice(0, startIdx) +
      block +
      source.slice(endIdx + markers.end.length)
    );

  if (source === "") return `${block}\n`;
  const separator = source.endsWith("\n") ? "\n" : "\n\n";
  return `${source}${separator}${block}\n`;
}
