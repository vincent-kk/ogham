/**
 * @file ruleDocsSync.ts
 * @description MCP tool handler for rule doc deployment driven by the
 * setup skill. Three actions wrap the core functions in
 * `configLoader.ts`:
 *
 *   - `status` — inspect current filesystem state, returned as a
 *     checkbox-ready snapshot (includes drift info against template hashes).
 *   - `sync`   — synchronise the active host target to the provided selection.
 *     Drifted optional rules are left untouched unless their id appears in
 *     the `resync` input; drifted required rules are always overwritten.
 *   - `manifest` — return the raw manifest (id/filename/required/title/desc)
 *     for skill UI rendering.
 *
 * The setup skill's headless/CI fallback is the ONLY caller — the
 * interactive path now runs through the `open_settings` settings page.
 * Session hooks MUST NOT invoke this tool.
 */
import {
  RULE_DOC_ACTIONS,
  RULE_DOC_INPUT_ERROR_MESSAGES,
  RULE_DOC_UNRESOLVED_MANIFEST_SKIPPED,
} from '../../../constants/mcpContracts.js';
import {
  type RuleDocSyncResult,
  type RuleDocsManifest,
  type RuleDocsStatus,
  getRuleDocsStatus,
  loadRuleDocsManifest,
  resolvePluginRoot,
  syncRuleDocs,
} from '../../../core/infra/configLoader/index.js';

import { normalizeResync } from './utils/normalizeResync.js';
import { normalizeSelections } from './utils/normalizeSelections.js';
import { validateResyncIds } from './utils/validateResyncIds.js';

const UNRESOLVED_RULE_DOCS_MANIFEST: RuleDocsManifest = {
  version: '',
  rules: [],
};

export type RuleDocsAction =
  (typeof RULE_DOC_ACTIONS)[keyof typeof RULE_DOC_ACTIONS];

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
  | { action: typeof RULE_DOC_ACTIONS.STATUS; status: RuleDocsStatus }
  | {
      action: typeof RULE_DOC_ACTIONS.MANIFEST;
      pluginRootResolved: boolean;
      manifest: RuleDocsManifest;
      /** Populated when the plugin root could not be resolved. */
      skipped?: ReadonlyArray<{ id: string; reason: string }>;
    }
  | {
      action: typeof RULE_DOC_ACTIONS.SYNC;
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
    throw new Error(RULE_DOC_INPUT_ERROR_MESSAGES.INPUT_REQUIRED);

  if (!input.path) throw new Error(RULE_DOC_INPUT_ERROR_MESSAGES.PATH_REQUIRED);

  if (!input.action)
    throw new Error(RULE_DOC_INPUT_ERROR_MESSAGES.ACTION_REQUIRED);

  switch (input.action) {
    case RULE_DOC_ACTIONS.STATUS: {
      const status = getRuleDocsStatus(input.path);
      return { action: RULE_DOC_ACTIONS.STATUS, status };
    }

    case RULE_DOC_ACTIONS.MANIFEST: {
      const pluginRoot = resolvePluginRoot();
      if (pluginRoot === null)
        return {
          action: RULE_DOC_ACTIONS.MANIFEST,
          pluginRootResolved: false,
          manifest: UNRESOLVED_RULE_DOCS_MANIFEST,
          skipped: RULE_DOC_UNRESOLVED_MANIFEST_SKIPPED,
        };
      const manifest = loadRuleDocsManifest(pluginRoot);
      return {
        action: RULE_DOC_ACTIONS.MANIFEST,
        pluginRootResolved: true,
        manifest,
      };
    }

    case RULE_DOC_ACTIONS.SYNC: {
      // Normalise selection input. The active host target is the single source
      // of truth for rule doc state — no config-side tracking.
      const normalizedSelections = normalizeSelections(input.selections);
      const resyncRaw = normalizeResync(input.resync);

      // Required rules are enforced downstream by syncRuleDocs() from the
      // manifest, regardless of whether they appear in `normalized`.
      const selectedIds = new Set<string>();
      for (const [id, flag] of Object.entries(normalizedSelections))
        if (flag) selectedIds.add(id);

      const { resyncAccepted, preSkipped } = validateResyncIds(resyncRaw);

      const result = syncRuleDocs(input.path, selectedIds, {
        resync: new Set(resyncAccepted),
      });
      if (preSkipped.length > 0) result.skipped.push(...preSkipped);

      return {
        action: RULE_DOC_ACTIONS.SYNC,
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
