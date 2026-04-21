/**
 * @file rule-docs-sync.ts
 * @description MCP tool handler for rule doc deployment driven by the
 * filid-setup skill. Three actions wrap the core functions in
 * `config-loader.ts`:
 *
 *   - `status` — inspect current filesystem state, returned as a
 *     checkbox-ready snapshot (includes drift info against template hashes).
 *   - `sync`   — synchronise `.claude/rules/` to match the provided selection.
 *     Drifted optional rules are left untouched unless their id appears in
 *     the `resync` input; drifted required rules are always overwritten.
 *   - `manifest` — return the raw manifest (id/filename/required/title/desc)
 *     for skill UI rendering.
 *
 * The skill is the ONLY caller. Session hooks MUST NOT invoke this tool.
 */
import {
  type RuleDocSyncResult,
  type RuleDocsManifest,
  type RuleDocsStatus,
  getRuleDocsStatus,
  loadRuleDocsManifest,
  resolvePluginRoot,
  syncRuleDocs,
} from '../../../core/infra/config-loader/config-loader.js';

import { normalizeResync } from './utils/normalizeResync.js';
import { normalizeSelections } from './utils/normalizeSelections.js';

export type RuleDocsAction = 'status' | 'sync' | 'manifest';

export interface RuleDocsSyncInput {
  action: RuleDocsAction;
  path: string;
  /**
   * Required when `action === 'sync'`. Map of rule id → user selection.
   * `true` opts the rule in, `false` or absence opts out. Required rules
   * (manifest `required: true`) ignore this map.
   *
   * The expected shape is a raw object map. Some LLM-driven callers may
   * accidentally stringify the object, or emit `null` when the field is
   * absent — the handler recovers from both forms defensively, and the
   * registered JSON Schema accepts `null` via `.nullish()`.
   */
  selections?: Record<string, boolean> | string | null;
  /**
   * Optional for `action === 'sync'`. Rule ids whose deployed file should
   * be overwritten with the current template when drift is detected. Has
   * no effect on rules whose deployed file already matches the template,
   * or on required rules (which always auto-resync on drift).
   *
   * 생략하거나 null을 전달하면 선택적 rule의 drift는 `result.drift`에 보고만 되고 파일은 덮어쓰지 않습니다.
   *
   * Accepts the same defensive shapes as `selections`: string array, a
   * JSON-encoded string array, or `null` / `undefined`.
   */
  resync?: string[] | string | null;
}

export type RuleDocsSyncOutput =
  | { action: 'status'; status: RuleDocsStatus }
  | {
      action: 'manifest';
      manifest: RuleDocsManifest;
      /** Populated when the plugin root could not be resolved. */
      skipped?: Array<{ id: string; reason: string }>;
    }
  | {
      action: 'sync';
      result: RuleDocSyncResult;
      selections: Record<string, boolean>;
      /** Rule ids that were actually applied as resync targets after
       *  validation against the manifest. Unknown ids are dropped and
       *  recorded in `result.skipped`. */
      resync: string[];
    };

/**
 * Handle rule_docs_sync MCP tool calls.
 * Throws on invalid input or unresolvable plugin root.
 */
export function handleRuleDocsSync(args: unknown): RuleDocsSyncOutput {
  const input = args as RuleDocsSyncInput;

  if (!input || typeof input !== 'object')
    throw new Error('input object is required');

  if (!input.path) throw new Error('path is required');

  if (!input.action)
    throw new Error('action is required (status | sync | manifest)');

  switch (input.action) {
    case 'status': {
      const status = getRuleDocsStatus(input.path);
      return { action: 'status', status };
    }

    case 'manifest': {
      const pluginRoot = resolvePluginRoot();
      if (pluginRoot === null)
        return {
          action: 'manifest',
          manifest: { version: '', rules: [] },
          skipped: [{ id: '*', reason: 'CLAUDE_PLUGIN_ROOT not set' }],
        };
      const manifest = loadRuleDocsManifest(pluginRoot);
      return { action: 'manifest', manifest };
    }

    case 'sync': {
      // Normalise selection input. The filesystem under `.claude/rules/`
      // is the single source of truth for rule doc state — no config-side
      // tracking and no legacy cleanup.
      const normalizedSelections = normalizeSelections(input.selections);
      const resyncRaw = normalizeResync(input.resync);

      // Required rules are enforced downstream by syncRuleDocs() from the
      // manifest, regardless of whether they appear in `normalized`.
      const selectedIds = new Set<string>();
      for (const [id, flag] of Object.entries(normalizedSelections)) {
        if (flag) selectedIds.add(id);
      }

      // Validate resync ids against the manifest so unknown entries surface
      // as `skipped` rather than silently no-op.
      const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT;
      const knownIds = new Set<string>();
      const preSkipped: Array<{ id: string; reason: string }> = [];
      if (pluginRoot) {
        try {
          const manifest = loadRuleDocsManifest(pluginRoot);
          for (const entry of manifest.rules) knownIds.add(entry.id);
        } catch {
          // Manifest load failure is handled downstream by syncRuleDocs,
          // which records a `*` skip entry. Skip the pre-validation.
        }
      }
      const resyncAccepted: string[] = [];
      if (knownIds.size > 0) {
        for (const id of resyncRaw) {
          if (knownIds.has(id)) resyncAccepted.push(id);
          else preSkipped.push({ id, reason: 'unknown rule id' });
        }
      } else {
        // Without a manifest we cannot classify; forward everything and let
        // syncRuleDocs decide. Any unknown id is a silent no-op at that layer.
        resyncAccepted.push(...resyncRaw);
      }

      const result = syncRuleDocs(input.path, selectedIds, {
        resync: new Set(resyncAccepted),
      });
      if (preSkipped.length > 0) result.skipped.push(...preSkipped);

      return {
        action: 'sync',
        result,
        selections: normalizedSelections,
        resync: resyncAccepted,
      };
    }

    default: {
      throw new Error(
        `unknown action: ${String((input as { action?: string }).action)}`,
      );
    }
  }
}
