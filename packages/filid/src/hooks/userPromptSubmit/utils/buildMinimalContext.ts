import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { findConfigRoot } from '../../utils/findConfigRoot.js';
import { readHookConfig } from '../../utils/readHookConfig.js';

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
  else if (existsSync(join(root, '.claude', 'rules', 'filid_fca-policy.md')))
    lines.push(
      '[filid] FCA-AI active. Rules: .claude/rules/filid_fca-policy.md',
    );
  else if (existsSync(join(root, '.claude', 'rules', 'fca.md')))
    lines.push('[filid] FCA-AI active. Rules: .claude/rules/fca.md');
  else
    lines.push(
      '[filid] ⚠ Rules not deployed. Run /filid:setup to deploy .claude/rules/filid_fca-policy.md.',
    );

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
