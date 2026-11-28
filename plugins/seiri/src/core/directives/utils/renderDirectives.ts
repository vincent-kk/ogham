import { portableJoin, readUtf8FileIfExistsSync } from '@ogham/cross-platform';

import {
  DIRECTIVE_DOCUMENT_LIMITS,
  DIRECTIVE_INDEX_FILE,
  DIRECTIVE_REQUIRED_READS,
} from '../../../constants/directives.js';
import type { DirectiveSetSummary } from '../../../types/directives.js';

import { directiveDirectory } from './directiveDirectory.js';
import { listDirectiveFiles } from './listDirectiveFiles.js';

/**
 * Render a block of directives in one mode for all sets.
 * @param root Real checkout root.
 * @param sets Summaries of the selected sets.
 * @param budget Units available for the entire rendered block, including newlines.
 * @param measure Host length metric, using characters when omitted.
 * @returns Inline bodies when they fit and no entry document is over its limit, or set directory paths and a read instruction.
 * A structured set (one with an entry document) inlines only that document and names the required documents to read.
 */
export function renderDirectives(
  root: string,
  sets: DirectiveSetSummary[],
  budget: number,
  measure: (value: string) => number = (value) => value.length,
): string[] {
  const inline: string[] = [];
  const pointer: string[] = [];
  let oversized = false;
  for (const { set, files } of sets) {
    const directory = directiveDirectory(root, set);
    if (!directory) continue;
    const current = listDirectiveFiles(directory);
    const sizes = new Map(current.map(({ name, bytes }) => [name, bytes]));
    const structured = sizes.has(DIRECTIVE_INDEX_FILE);
    const present = structured
      ? [DIRECTIVE_INDEX_FILE]
      : files.filter((name) => sizes.has(name));
    if (!present.length) continue;
    const heading = `[seiri] Directives ${set}`;
    inline.push(heading, ...(structured ? [directory] : []));
    pointer.push(heading, directory);
    for (const name of present) {
      const body = readUtf8FileIfExistsSync(
        portableJoin(directory, `./${name}`),
      );
      if (body === null) return [];
      inline.push(`--- ${name} ---`, body);
    }
    if (!structured) continue;
    const reads = DIRECTIVE_REQUIRED_READS.filter((name) => sizes.get(name));
    if (reads.length)
      inline.push(
        `Read ${reads.join(', ')} in that directory before continuing.`,
      );
    const limit = DIRECTIVE_DOCUMENT_LIMITS[DIRECTIVE_INDEX_FILE];
    if ((sizes.get(DIRECTIVE_INDEX_FILE) ?? 0) > limit) {
      oversized = true;
      pointer.push(`${DIRECTIVE_INDEX_FILE} exceeds ${limit} bytes; split it.`);
    }
  }
  if (!oversized && (measure(inline.join('\n')) <= budget || !pointer.length))
    return inline;
  return [
    ...pointer,
    `Read ${DIRECTIVE_INDEX_FILE} in each directory before continuing; where there is none, reread every file except binding.json.`,
  ];
}
