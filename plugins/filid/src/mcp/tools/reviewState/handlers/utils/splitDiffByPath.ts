/** Sections of one multi-path `git diff`, attributed to the requested paths. */
export interface SplitDiffByPath {
  /** Verbatim single-path diff text for every requested path Git printed unquoted. */
  matched: Map<string, string>;
  /** Sections whose header matched no requested path, i.e. paths Git quoted. */
  unmatchedSections: number;
}

const HEADER_PREFIX = 'diff --git ';

/**
 * Split a multi-path unified diff into per-path sections.
 *
 * A section runs from one `diff --git` header line to the next. A section
 * is attributed to a requested path only when its header is exactly
 * `diff --git a/<path> b/<path>`, which Git prints for every path it does
 * not quote; a quoted header is counted, not guessed at. Patch body lines
 * always carry a prefix character, so a raw header can only start a section.
 *
 * @param diffText Output of `git diff` over several paths, renames disabled.
 * @param paths Paths the diff was requested for.
 * @returns Attributed sections plus the count of sections left unattributed.
 */
export function splitDiffByPath(
  diffText: string,
  paths: readonly string[],
): SplitDiffByPath {
  const pathByHeader = new Map(
    paths.map((path) => [`${HEADER_PREFIX}a/${path} b/${path}`, path]),
  );
  const matched = new Map<string, string>();
  let unmatchedSections = 0;
  for (const section of listSections(diffText)) {
    const newline = section.indexOf('\n');
    const header = newline === -1 ? section : section.slice(0, newline);
    const path = pathByHeader.get(header);
    if (path === undefined) unmatchedSections += 1;
    else matched.set(path, section);
  }
  return { matched, unmatchedSections };
}

function listSections(diffText: string): string[] {
  const sections: string[] = [];
  for (const line of diffText.split(/(?<=\n)/))
    if (line.startsWith(HEADER_PREFIX) || sections.length === 0)
      sections.push(line);
    else sections[sections.length - 1] += line;
  return diffText.startsWith(HEADER_PREFIX) ? sections : [];
}
