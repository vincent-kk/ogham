import { portableJoin, readUtf8FileIfExistsSync } from '@ogham/cross-platform';

import type { DirectiveSetSummary } from '../../../types/directives.js';

import { directiveDirectory } from './directiveDirectory.js';
import { listDirectiveFiles } from './listDirectiveFiles.js';

/**
 * Render a block of directives in one mode for all sets.
 * @param root Real checkout root.
 * @param sets Summaries of the selected sets.
 * @param budget Units available for the entire rendered block, including newlines.
 * @param measure Host length metric, using characters when omitted.
 * @returns Inline bodies when they fit, or set directory paths and a read instruction.
 */
export function renderDirectives(
  root: string,
  sets: DirectiveSetSummary[],
  budget: number,
  measure: (value: string) => number = (value) => value.length,
): string[] {
  const inline: string[] = [];
  const pointer: string[] = [];
  for (const { set, files } of sets) {
    const directory = directiveDirectory(root, set);
    if (!directory) continue;
    const current = listDirectiveFiles(directory).map(({ name }) => name);
    const present = files.filter((name) => current.includes(name));
    if (!present.length) continue;
    const heading = `[seiri] Directives ${set}`;
    inline.push(heading);
    pointer.push(heading, directory);
    for (const name of present) {
      const path = portableJoin(directory, `./${name}`);
      const body = readUtf8FileIfExistsSync(path);
      if (body === null) return [];
      inline.push(`--- ${name} ---`, body);
    }
  }
  if (measure(inline.join('\n')) <= budget || !pointer.length) return inline;
  return [
    ...pointer,
    'Reread every file in these directories except binding.json before continuing.',
  ];
}
