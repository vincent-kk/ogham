import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  INSTRUCTIONS_FILES,
  readSection,
} from '@ogham/cross-platform/instructions';

import {
  FCA_POLICY_RULE_DOC,
  LEGACY_FCA_POLICY_RULE_DOC,
  ruleDocMarkers,
} from '../../../constants/ruleDocs.js';
import { findConfigRoot } from '../../utils/findConfigRoot.js';
import { readHookConfig } from '../../utils/readHookConfig.js';

const RULES_DIR = join('.claude', 'rules');

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
    const deployedAt = locateFcaPolicy(root);
    lines.push(
      deployedAt === null
        ? `[filid] ⚠ Rules not deployed. Run /filid:setup to deploy ${join(RULES_DIR, FCA_POLICY_RULE_DOC)}.`
        : `[filid] FCA-AI active. Rules: ${deployedAt}`,
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

/**
 * Where the mandatory rule document actually landed, or null if nowhere.
 *
 * Every channel is searched, not just Claude's. Off Claude the MCP server merges rule
 * documents into the host's instruction file instead of writing `.claude/rules/`, and a
 * hook cannot ask which host it is on — the adapters inject `OGHAM_HOST` into the MCP
 * declaration only. Checking one channel would make this hook announce "rules not
 * deployed" over rules the very same plugin had just deployed.
 *
 * Claude's channel is checked first, so the host that already works pays nothing: the
 * instruction files are read only when the directory has nothing to show.
 */
function locateFcaPolicy(root: string): string | null {
  for (const filename of [FCA_POLICY_RULE_DOC, LEGACY_FCA_POLICY_RULE_DOC]) {
    const path = join(RULES_DIR, filename);
    if (existsSync(join(root, path))) return path;
  }

  const markers = ruleDocMarkers(FCA_POLICY_RULE_DOC);
  for (const filename of INSTRUCTIONS_FILES) {
    const path = join(root, filename);
    if (!existsSync(path)) continue;
    if (readSection(readFileSync(path, 'utf8'), markers) !== null)
      return filename;
  }

  return null;
}
