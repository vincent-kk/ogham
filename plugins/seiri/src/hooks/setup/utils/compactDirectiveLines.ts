import { DIRECTIVES_CONTEXT_LIMIT } from '../../../constants/directives.js';
import { readDirectiveBindings } from '../../../core/directives/utils/readDirectiveBindings.js';
import { renderDirectives } from '../../../core/directives/utils/renderDirectives.js';
import { selectDirectiveSets } from '../../../core/directives/utils/selectDirectiveSets.js';
import { summarizeDirectiveSet } from '../../../core/directives/utils/summarizeDirectiveSet.js';
import { updateDirectiveBinding } from '../../../core/directives/utils/updateDirectiveBinding.js';
import type {
  WorkflowHostAdapter,
  WorkflowIdentity,
} from '../../../types/workflow.js';

/**
 * Prepare the compact directive block and refresh the sets' retention timestamps.
 * @param identity Real checkout and native actor eligible for injection.
 * @param host Host whose context budget and length unit apply.
 * @param existing Existing context lines, including progress when available.
 * @param now Epoch milliseconds shared by this SessionStart.
 * @returns The block to insert, or an empty list when unavailable.
 */
export function compactDirectiveLines(
  { actor, root }: WorkflowIdentity,
  host: WorkflowHostAdapter['name'],
  existing: string[],
  now: number,
): string[] {
  try {
    const selected = selectDirectiveSets(
      readDirectiveBindings(root),
      actor,
      root,
    );
    const sets = selected.flatMap(
      (set) => summarizeDirectiveSet(root, set) ?? [],
    );
    const measure =
      host === 'codex' ? Buffer.byteLength : (text: string) => text.length;
    const budget =
      DIRECTIVES_CONTEXT_LIMIT[host] - measure(existing.join('\n')) - 1;
    const lines = renderDirectives(root, sets, budget, measure);
    if (lines.length)
      for (const { set } of sets)
        updateDirectiveBinding(root, set, (current) =>
          current?.enabled ? { ...current, lastInjectedAt: now } : current,
        );
    return lines;
  } catch {
    return [];
  }
}
