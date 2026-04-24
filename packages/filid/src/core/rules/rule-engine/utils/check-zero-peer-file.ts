import { ALLOWED_FRACTAL_ROOT_FILES } from '../../../../constants/allowed-peer-files.js';
import { BUILTIN_RULE_IDS } from '../../../../constants/builtin-rule-ids.js';
import type { AllowedEntry } from '../../../infra/config-loader/loaders/config-schemas.js';
import type { RuleContext, RuleViolation } from '../../../../types/rules.js';
import { isExempt } from './is-exempt.js';

/**
 * Factory returning the zero-peer-file check bound to the project's
 * `additional-allowed` config. Using a factory keeps the closure over
 * `additionalAllowed` explicit while letting the returned function satisfy
 * the `Rule.check` signature.
 */
export function checkZeroPeerFile(
  additionalAllowed?: AllowedEntry[],
): (context: RuleContext) => RuleViolation[] {
  return (context: RuleContext): RuleViolation[] => {
    const { node } = context;
    if (node.type !== 'fractal' && node.type !== 'hybrid') return [];

    const peerFiles = node.metadata['peerFiles'] as string[] | undefined;
    if (!peerFiles || peerFiles.length === 0) return [];

    // Compose the full allowed set for THIS node
    const allowed = new Set(ALLOWED_FRACTAL_ROOT_FILES);

    // Category: eponymous file (max 1, auto-detected by scanProject)
    const eponymous = node.metadata['eponymousFile'] as
      | string
      | null
      | undefined;
    if (eponymous) allowed.add(eponymous);

    // Category: framework reserved files (auto-detected from package.json)
    const fwFiles = node.metadata['frameworkReservedFiles'] as
      | string[]
      | undefined;
    if (fwFiles) for (const f of fwFiles) allowed.add(f);

    // Category: additional-allowed from .filid/config.json
    //   string entry  → allowed everywhere (backward-compat).
    //   object entry  → allowed only when entry.paths glob matches node.path.
    if (additionalAllowed) {
      for (const entry of additionalAllowed) {
        if (typeof entry === 'string') {
          allowed.add(entry);
          continue;
        }
        if (entry.paths && !isExempt(node, entry.paths)) continue;
        allowed.add(entry.basename);
      }
    }

    const disallowed = peerFiles.filter((f) => !allowed.has(f));
    if (disallowed.length === 0) return [];

    return disallowed.map((file) => ({
      ruleId: BUILTIN_RULE_IDS.ZERO_PEER_FILE,
      severity: 'warning' as const,
      message: `Fractal root "${node.name}" contains peer file "${file}" not in any allowed category. Promote it to a sub-fractal directory.`,
      path: node.path,
      suggestion: `Create a subdirectory for "${file}" or add it to .filid/config.json additional-allowed if it belongs at the root.`,
    }));
  };
}
