import { portableJoin } from '@ogham/cross-platform';

import { DIRECTIVE_BINDING_FILE } from '../../../constants/directives.js';
import type { DirectiveBinding } from '../../../types/directives.js';

import { directiveDirectory } from './directiveDirectory.js';
import { listDirectiveSets } from './listDirectiveSets.js';
import { readDirectiveBinding } from './readDirectiveBinding.js';

/**
 * Read existing connections without changing their lock or activity.
 * @param root Real checkout root.
 * @returns Records keyed by set, excluding missing or malformed records.
 */
export function readDirectiveBindings(
  root: string,
): Record<string, DirectiveBinding> {
  const bindings: Record<string, DirectiveBinding> = {};
  for (const set of listDirectiveSets(root)) {
    const directory = directiveDirectory(root, set);
    if (!directory) continue;
    const binding = readDirectiveBinding(
      portableJoin(directory, DIRECTIVE_BINDING_FILE),
    );
    if (binding) bindings[set] = binding;
  }
  return bindings;
}
