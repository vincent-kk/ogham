import { existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  loadConfig,
  resolveLanguage,
} from '../../../core/infra/config-loader/config-loader.js';
import { loadBuiltinRules } from '../../../core/rules/rule-engine/rule-engine.js';

/**
 * Build minimal FCA-AI context.
 *
 * Probes `.claude/rules/filid_fca-policy.md` (new) then `.claude/rules/fca.md`
 * (legacy) to choose between the active pointer line and the
 * "rules not deployed" warning. Always emits exactly one `[filid:lang]` line.
 */
export function buildMinimalContext(cwd: string): string {
  const lines: string[] = [];
  const { config } = loadConfig(cwd);

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

  lines.push(`[filid:lang] ${resolveLanguage(config)}`);

  if (config) {
    try {
      const overrides = config.rules ?? {};
      const allRules = loadBuiltinRules(
        overrides,
        config['additional-allowed'],
      );
      const disabledRules = allRules.filter((r) => !r.enabled);
      if (disabledRules.length > 0) {
        lines.push(
          `[filid] Disabled rules: ${disabledRules.map((r) => r.id).join(', ')}`,
        );
      }
    } catch {
      // rule-engine load failure — skip the disabled-rules line silently;
      // the pointer + lang tag above are already in place.
    }
  }

  return lines.join('\n');
}
