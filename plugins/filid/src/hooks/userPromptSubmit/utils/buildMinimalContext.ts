import { findConfigRoot } from '../../utils/findConfigRoot.js';
import { readHookConfig } from '../../utils/readHookConfig.js';

import { inspectFcaPolicy } from './inspectFcaPolicy.js';

export function buildMinimalContext(cwd: string): string {
  const lines: string[] = [];
  // Resolve the project root once (walking up from a subdirectory if needed),
  // then read both the config and the rule-doc pointer from that same root so
  // the pointer and the language tag stay consistent regardless of cwd depth.
  const root = findConfigRoot(cwd) ?? cwd;
  const config = readHookConfig(root);

  if (!config)
    lines.push(
      '[filid] ⚠ Not initialized. Run /filid:setup to create .filid/config.json.',
    );
  else {
    const inspection = inspectFcaPolicy(root);
    lines.push(
      inspection?.deployed === true
        ? `[filid] FCA-AI active. Rules: ${inspection.displayTarget}`
        : `[filid] ⚠ Rules not deployed. Run /filid:setup to deploy ${inspection?.displayTarget ?? 'the host rule target'}.`,
    );
  }

  lines.push(`[filid:lang] ${config?.language ?? 'en'}`);

  if (config) {
    const disabledIds = Object.entries(config.rules ?? {})
      .filter(([, override]) => override?.enabled === false)
      .map(([id]) => id)
      .sort();
    if (disabledIds.length > 0)
      lines.push(`[filid] Disabled rules: ${disabledIds.join(', ')}`);
  }

  return lines.join('\n');
}
