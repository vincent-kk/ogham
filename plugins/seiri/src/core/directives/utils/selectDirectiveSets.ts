import { samePath } from '@ogham/cross-platform';

import type { DirectiveBinding } from '../../../types/directives.js';

/**
 * Choose enabled sets for the requesting main actor in the original checkout.
 * @param bindings Validated connection records keyed by set name.
 * @param actor Hashed native workflow actor.
 * @param root Real checkout root of the requesting actor.
 * @returns Alphabetically sorted names of the selected sets.
 */
export function selectDirectiveSets(
  bindings: Record<string, DirectiveBinding>,
  actor: string,
  root: string,
): string[] {
  return Object.entries(bindings)
    .filter(
      ([, binding]) =>
        binding.enabled &&
        samePath(binding.root, root) &&
        (binding.scope === 'all' || binding.actor === actor),
    )
    .map(([set]) => set)
    .sort();
}
