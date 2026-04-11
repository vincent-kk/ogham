/**
 * @file rule-docs-sync.ts
 * @description MCP tool handler for rule doc deployment driven by the
 * filid-setup skill. Three actions wrap the core functions in
 * `config-loader.ts`:
 *
 *   - `status` — inspect current state (config + filesystem), returned as a
 *     checkbox-ready snapshot.
 *   - `sync`   — write the provided selection into `.filid/config.json`
 *     (`injected-rules`) and synchronise `.claude/rules/` accordingly.
 *   - `manifest` — return the raw manifest (id/filename/required/title/desc)
 *     for skill UI rendering.
 *
 * The skill is the ONLY caller. Session hooks MUST NOT invoke this tool.
 */
import {
  getRuleDocsStatus,
  loadConfig,
  loadRuleDocsManifest,
  syncRuleDocs,
  writeConfig,
  createDefaultConfig,
  type FilidConfig,
  type RuleDocSyncResult,
  type RuleDocsManifest,
  type RuleDocsStatus,
} from '../../../core/infra/config-loader/config-loader.js';

export type RuleDocsAction = 'status' | 'sync' | 'manifest';

export interface RuleDocsSyncInput {
  action: RuleDocsAction;
  path: string;
  /**
   * Required when `action === 'sync'`. Map of rule id → user selection.
   * `true` opts the rule in, `false` or absence opts out. Required rules
   * (manifest `required: true`) ignore this map.
   */
  selections?: Record<string, boolean>;
}

export type RuleDocsSyncOutput =
  | { action: 'status'; status: RuleDocsStatus }
  | { action: 'manifest'; manifest: RuleDocsManifest }
  | {
      action: 'sync';
      result: RuleDocSyncResult;
      configWritten: boolean;
      selections: Record<string, boolean>;
    };

/**
 * Handle rule_docs_sync MCP tool calls.
 * Throws on invalid input or unresolvable plugin root.
 */
export function handleRuleDocsSync(args: unknown): RuleDocsSyncOutput {
  const input = args as RuleDocsSyncInput;

  if (!input || typeof input !== 'object') {
    throw new Error('input object is required');
  }
  if (!input.path) {
    throw new Error('path is required');
  }
  if (!input.action) {
    throw new Error('action is required (status | sync | manifest)');
  }

  switch (input.action) {
    case 'status': {
      const status = getRuleDocsStatus(input.path);
      return { action: 'status', status };
    }

    case 'manifest': {
      const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
      if (!pluginRoot) {
        throw new Error(
          'CLAUDE_PLUGIN_ROOT is not set; cannot load rule docs manifest',
        );
      }
      const manifest = loadRuleDocsManifest(pluginRoot);
      return { action: 'manifest', manifest };
    }

    case 'sync': {
      const selections = input.selections ?? {};

      // Persist the user selection to the root .filid/config.json before
      // touching the filesystem so the config-loader remains the single
      // source of truth for "desired state".
      const existing = loadConfig(input.path);
      const config: FilidConfig = existing ?? createDefaultConfig();
      const normalized: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(selections)) {
        normalized[key] = value === true;
      }
      config['injected-rules'] = normalized;

      let configWritten: boolean;
      try {
        writeConfig(input.path, config);
        configWritten = true;
      } catch {
        configWritten = false;
      }

      // Build only the optional user selection set here.
      // Required rules are enforced downstream by syncRuleDocs() from the
      // manifest, regardless of whether they appear in `normalized`.
      const selectedIds = new Set<string>();
      for (const [id, flag] of Object.entries(normalized)) {
        if (flag) selectedIds.add(id);
      }
      const result = syncRuleDocs(input.path, selectedIds);

      return {
        action: 'sync',
        result,
        configWritten,
        selections: normalized,
      };
    }

    default: {
      throw new Error(
        `unknown action: ${String((input as { action?: string }).action)}`,
      );
    }
  }
}
