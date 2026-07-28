import { portableBasename } from '@ogham/cross-platform/paths';

import { BUILTIN_RULE_IDS } from '../../../../constants/builtinRuleIds.js';
import { DETAIL_MD, INTENT_MD } from '../../../../constants/documentFiles.js';
import type { RuleContext, RuleViolation } from '../../../../types/rules.js';
import type { AllowedPeerOverride } from '../../../infra/configLoader/index.js';

import { isExempt } from './isExempt.js';

/**
 * Factory returning the zero-peer-file check bound to the project's
 * `structure.additionalAllowedPeers` config. Using a factory keeps the closure
 * over `additionalAllowed` explicit while letting the returned function satisfy
 * the `Rule.check` signature.
 */
export function checkZeroPeerFile(
  additionalAllowed?: AllowedPeerOverride[],
): (context: RuleContext) => RuleViolation[] {
  return (context: RuleContext): RuleViolation[] => {
    const { node } = context;
    if (node.type !== 'fractal' && node.type !== 'hybrid') return [];

    const peerFiles = node.peerFiles;
    if (peerFiles.length === 0) return [];

    const allowed = new Set([INTENT_MD, DETAIL_MD]);
    for (const entryPoint of node.entryPoints)
      allowed.add(portableBasename(entryPoint.path));

    // Category: eponymous file (max 1, auto-detected by scanProject)
    const eponymous = node.metadata['eponymousFile'] as
      string | null | undefined;
    if (eponymous) allowed.add(portableBasename(eponymous));

    // Category: framework reserved files (auto-detected from package.json)
    const fwFiles = node.metadata['frameworkReservedFiles'] as
      string[] | undefined;
    if (fwFiles)
      for (const file of fwFiles) allowed.add(portableBasename(file));

    // Category: structure.additionalAllowedPeers from .filid/config.json —
    // allowed only when entry.paths glob matches node.path (paths omitted =
    // every boundary) and entry.adapterId matches a reported entry point.
    if (additionalAllowed)
      for (const entry of additionalAllowed) {
        if (entry.paths && !isExempt(node, entry.paths)) continue;
        if (
          entry.adapterId &&
          !node.entryPoints.some(
            (entryPoint) => entryPoint.adapterId === entry.adapterId,
          )
        )
          continue;
        allowed.add(entry.basename);
      }

    const disallowed = peerFiles.filter(
      (file) => !allowed.has(portableBasename(file)),
    );
    if (disallowed.length === 0) return [];

    return disallowed.map((file) => ({
      ruleId: BUILTIN_RULE_IDS.ZERO_PEER_FILE,
      severity: 'warning' as const,
      message: `Fractal root "${node.name}" contains peer file "${file}" not in any allowed category. Promote it to a sub-fractal directory.`,
      path: node.path,
      suggestion: `Create a subdirectory for "${file}" or configure it as an allowed peer for this boundary.`,
    }));
  };
}
