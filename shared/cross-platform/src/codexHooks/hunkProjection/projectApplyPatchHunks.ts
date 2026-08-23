import type {
  ApplyPatchHunk,
  ApplyPatchHunkLine,
  ProjectApplyPatchHunksResult,
} from "../types.js";

/**
 * Project ordered Codex update hunks onto current content without filesystem I/O.
 *
 * @param current - Complete source content to update
 * @param hunks - Ordered hunk provenance from `parseApplyPatch`
 * @returns Exact projected content, or the first stale or ambiguous hunk index
 */
export function projectApplyPatchHunks(
  current: string,
  hunks: readonly (Omit<ApplyPatchHunk, "lines"> & {
    readonly lines: readonly ApplyPatchHunkLine[];
  })[],
): ProjectApplyPatchHunksResult {
  const source = splitContent(current);
  const lines = [...source.lines];
  let cursor = 0;

  for (const [hunkIndex, hunk] of hunks.entries()) {
    let searchStart = cursor;
    if (hunk.header !== "") {
      const headerIndex = lines.findIndex(
        (line, index) => index >= cursor && line.includes(hunk.header),
      );
      if (headerIndex < 0) return { kind: "stale-source", hunkIndex };
      searchStart = headerIndex;
    }

    const before = hunk.lines
      .filter((line) => line.prefix !== "+")
      .map((line) => line.text);
    const matches = findMatches(lines, before, searchStart);
    if (matches.length === 0) return { kind: "stale-source", hunkIndex };
    if (matches.length > 1) return { kind: "ambiguous", hunkIndex };

    const match = matches[0];
    const after = hunk.lines
      .filter((line) => line.prefix !== "-")
      .map((line) => line.text);
    lines.splice(match, before.length, ...after);
    cursor = match + after.length;
  }

  return {
    kind: "exact",
    content:
      lines.join(source.eol) + (source.trailingNewline ? source.eol : ""),
  };
}

/**
 * Split content into logical lines while retaining its output newline contract.
 *
 * @param current - Complete source content
 * @returns Logical lines, preferred EOL, and trailing-newline presence
 */
function splitContent(current: string) {
  const trailing = current.match(/(?:\r\n|[\n\r])$/)?.[0];
  const eol = current.match(/\r\n|[\n\r]/)?.[0] ?? "\n";
  const body = trailing ? current.slice(0, -trailing.length) : current;
  const lines =
    body === "" ? (current === "" ? [] : [""]) : body.split(/\r\n|[\n\r]/);
  return { lines, eol, trailingNewline: trailing !== undefined };
}

/**
 * Find every contiguous occurrence of one before-image in the search window.
 *
 * @param lines - Mutable projected content lines
 * @param before - Context and removal lines that must match
 * @param start - First candidate line index
 * @returns Candidate start indexes in ascending order
 */
function findMatches(
  lines: string[],
  before: string[],
  start: number,
): number[] {
  const matches: number[] = [];
  for (let index = start; index <= lines.length - before.length; index += 1)
    if (before.every((line, offset) => lines[index + offset] === line))
      matches.push(index);
  return matches;
}
