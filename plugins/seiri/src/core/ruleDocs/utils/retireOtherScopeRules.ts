import type { ManagedRuleDocument } from '@ogham/agent-artifacts/rules';

import type { SeiriConfigScope } from '../../../types/config.js';
import type { RuleDocScopeReport } from '../../../types/manifest.js';

import { createSeiriRuleManager } from './createSeiriRuleManager.js';
import { inspectOtherScopeRules } from './inspectOtherScopeRules.js';

/**
 * Remove this owner's rule documents from the layer the caller did not choose.
 *
 * A rule that lives at both layers is read twice by the host, and when the
 * two copies differ nothing says which one wins — so "the layer decides where
 * the rules go" is only true if the other layer is emptied. Call this *after*
 * the chosen layer has been written: the reverse order leaves a window where
 * a failure has removed the old copy without having written the new one.
 *
 * The engine's owned-namespace restriction is what keeps a foreign file safe;
 * no filtering here re-implements it.
 *
 * @param projectRoot Anchor for the project channel.
 * @param documents The manifest's managed documents. Passing them as the
 *   request set is what lets the engine also retire an owned document this
 *   plugin no longer ships.
 * @param scope The layer that was written. The other one is emptied.
 * @returns The other layer with the filenames actually removed from it, or
 *   `null` when it held nothing of this owner's — in which case nothing was
 *   written and no channel directory was created. A report whose `filenames`
 *   is empty therefore says the removal was attempted and did not take, which
 *   a `null` would have hidden.
 */
export function retireOtherScopeRules(
  projectRoot: string,
  documents: readonly ManagedRuleDocument[],
  scope: SeiriConfigScope,
): RuleDocScopeReport | null {
  const report = inspectOtherScopeRules(projectRoot, documents, scope);
  if (report === null) return null;

  const manager = createSeiriRuleManager(projectRoot, report.scope);
  if (manager === null) return null;

  const shipped = new Map(
    documents.map((document) => [document.id, document.filename] as const),
  );
  const removed = manager
    .apply(
      manager.plan({
        documents,
        desired: new Set<string>(),
        replaceDrift: new Set<string>(),
      }),
    )
    .outcomes.filter((outcome) => outcome.action === 'remove')
    // An orphan's id is already its filename; a shipped rule's is not.
    .map((outcome) => shipped.get(outcome.id) ?? outcome.id);

  return { ...report, filenames: removed };
}
