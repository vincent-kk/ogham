import { existsSync } from 'node:fs';

import {
  assertNoSymlinkDescendantsSync,
  listDirectoryIfExistsSync,
  portableDirname,
  portableRelative,
  resolveContainedPath,
  samePath,
} from '@ogham/cross-platform';

/** Repository instruction filenames discovered independently while walking upward. */
const REPOSITORY_INSTRUCTION_NAMES = ['CLAUDE.md', 'AGENTS.md'] as const;

/**
 * Find nearest repository instructions and every root Claude rule for one file.
 * @param projectRoot Absolute repository root that bounds discovery.
 * @param filePath Repository-relative changed path.
 * @returns Deduplicated project-relative rule paths in discovery order.
 */
export function findRepositoryRulePaths(
  projectRoot: string,
  filePath: string,
): string[] {
  const absoluteFile = resolveContainedPath(projectRoot, filePath);
  let directory = portableDirname(absoluteFile);
  assertNoSymlinkDescendantsSync(projectRoot, directory);
  const found = new Set<string>();
  const resolvedNames = new Set<string>();
  while (true) {
    for (const name of REPOSITORY_INSTRUCTION_NAMES) {
      if (resolvedNames.has(name)) continue;
      const candidate = resolveContainedPath(directory, name);
      assertNoSymlinkDescendantsSync(projectRoot, candidate);
      if (existsSync(candidate)) {
        found.add(
          portableRelative(projectRoot, candidate).replaceAll('\\', '/'),
        );
        resolvedNames.add(name);
      }
    }
    if (samePath(directory, projectRoot)) break;
    directory = portableDirname(directory);
  }
  const claudeRules = resolveContainedPath(projectRoot, '.claude', 'rules');
  assertNoSymlinkDescendantsSync(projectRoot, claudeRules);
  for (const name of [...listDirectoryIfExistsSync(claudeRules)]
    .filter((entry) => entry.endsWith('.md'))
    .sort()) {
    const candidate = resolveContainedPath(claudeRules, name);
    assertNoSymlinkDescendantsSync(projectRoot, candidate);
    found.add(portableRelative(projectRoot, candidate).replaceAll('\\', '/'));
  }
  return [...found];
}
