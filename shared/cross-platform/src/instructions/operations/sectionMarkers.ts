import type { SectionMarkers } from "./types.js";

/**
 * Delimiters for one plugin-owned section of an instruction file.
 *
 * Sections are located by plain substring search, so any number of them coexist in one
 * file as long as their markers differ — which is what `id` is for: Codex collapses a
 * whole directory of rule documents into a single `AGENTS.md`, and each document needs
 * its own addressable span to stay individually updatable and removable.
 *
 * maencof's long-standing `<!-- MAENCOF:START -->` pair is the id-less form of this
 * same convention, so files it already manages keep parsing unchanged.
 */
export function sectionMarkers(namespace: string, id?: string): SectionMarkers {
  const suffix = id === undefined ? "" : `:${id}`;
  return {
    start: `<!-- ${namespace}:START${suffix} -->`,
    end: `<!-- ${namespace}:END${suffix} -->`,
  };
}
