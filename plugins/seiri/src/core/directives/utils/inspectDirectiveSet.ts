import { portableJoin, readUtf8FileIfExistsSync } from '@ogham/cross-platform';

import {
  DIRECTIVE_INDEX_FILE,
  DIRECTIVE_LOG_FILES,
} from '../../../constants/directives.js';
import type { DirectiveInspection } from '../../../types/directives.js';

import { directiveDirectory } from './directiveDirectory.js';
import { findIndexViolations } from './inspection/findIndexViolations.js';
import { findInvalidLogLines } from './inspection/findInvalidLogLines.js';
import { findLimitViolations } from './inspection/findLimitViolations.js';
import { readLogLines } from './inspection/readLogLines.js';
import { listDirectiveFiles } from './listDirectiveFiles.js';

/**
 * Check a directive set against the structured-set contract.
 * @param root Real checkout root.
 * @param set Kebab-case name of the set to inspect.
 * @returns The inspection, or undefined for a missing set. A set without an entry document is unstructured and reports no violations.
 */
export function inspectDirectiveSet(
  root: string,
  set: string,
): DirectiveInspection | undefined {
  const directory = directiveDirectory(root, set);
  if (!directory) return undefined;
  const files = listDirectiveFiles(directory);
  const names = files.map(({ name }) => name);
  const notepadLines = names.includes(DIRECTIVE_LOG_FILES.notepad)
    ? readLogLines(directory, DIRECTIVE_LOG_FILES.notepad).length
    : 0;
  const index = names.includes(DIRECTIVE_INDEX_FILE)
    ? readUtf8FileIfExistsSync(
        portableJoin(directory, `./${DIRECTIVE_INDEX_FILE}`),
      )
    : null;
  if (index === null)
    return { structured: false, violations: [], notepadLines };
  return {
    structured: true,
    violations: [
      ...findLimitViolations(files),
      ...findIndexViolations(names, index),
      ...findInvalidLogLines(directory, names),
    ],
    notepadLines,
  };
}
