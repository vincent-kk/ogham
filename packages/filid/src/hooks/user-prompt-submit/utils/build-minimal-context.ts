import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { readHookConfig } from '../../utils/read-hook-config.js';

export function buildMinimalContext(cwd: string): string {
  const lines: string[] = [];
  const config = readHookConfig(cwd);

  if (!config) {
    lines.push(
      '[filid] ⚠ Not initialized. Run /filid:filid-setup to create .filid/config.json.',
    );
  } else if (existsSync(join(cwd, '.claude', 'rules', 'filid_fca-policy.md'))) {
    lines.push(
      '[filid] FCA-AI active. Rules: .claude/rules/filid_fca-policy.md',
    );
  } else if (existsSync(join(cwd, '.claude', 'rules', 'fca.md'))) {
    lines.push('[filid] FCA-AI active. Rules: .claude/rules/fca.md');
  } else {
    lines.push(
      '[filid] ⚠ Rules not deployed. Run /filid:filid-setup to deploy .claude/rules/filid_fca-policy.md.',
    );
  }

  lines.push(`[filid:lang] ${config?.language ?? 'en'}`);

  if (config) {
    const disabledIds = Object.entries(config.rules ?? {})
      .filter(([, override]) => override?.enabled === false)
      .map(([id]) => id)
      .sort();
    if (disabledIds.length > 0) {
      lines.push(`[filid] Disabled rules: ${disabledIds.join(', ')}`);
    }
  }

  return lines.join('\n');
}
