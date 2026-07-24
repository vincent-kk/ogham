import { existsSync } from 'node:fs';

import { portableJoin } from '@ogham/cross-platform/compat';

import type { RuleDocEntry } from '../../../types/manifest.js';
import { computeFileSha256 } from '../../utils/computeFileSha256.js';
import { loadManifest } from '../loaders/loadManifest.js';

import {
  type RuleDocDecision,
  decideRuleDocAction,
} from './decideRuleDocAction.js';
import { resolveRulesDir } from './resolveRulesDir.js';
import { resolveTemplatePath } from './resolveTemplatePath.js';

/** One rule's decision plus the paths the caller would act on. */
export interface RuleDocDecisionRecord {
  entry: RuleDocEntry;
  decision: RuleDocDecision;
  destPath: string;
  templatePath: string;
}

/**
 * Read the current state of every manifest rule and decide what should
 * happen to it. This is the whole read half of a sync; `planRuleDocs`
 * renders the result and `applyRuleDocs` executes it, so a preview and
 * the write that follows it can never disagree.
 */
export function collectRuleDocDecisions(
  projectRoot: string,
  pluginRoot: string,
  selection: Iterable<string>,
  resync: Iterable<string> = [],
): RuleDocDecisionRecord[] {
  const rulesDir = resolveRulesDir(projectRoot);
  const selectionSet = new Set(selection);
  const resyncSet = new Set(resync);

  return loadManifest(pluginRoot).rules.map((entry) => {
    const destPath = portableJoin(rulesDir, entry.filename);
    const templatePath = resolveTemplatePath(pluginRoot, entry.filename);
    const destExists = existsSync(destPath);

    const decision = decideRuleDocAction({
      selected: selectionSet.has(entry.id),
      resync: resyncSet.has(entry.id),
      destExists,
      deployedHash: destExists ? computeFileSha256(destPath) : null,
      templateHash: entry.templateHash,
      templateExists: existsSync(templatePath),
    });

    return { entry, decision, destPath, templatePath };
  });
}
