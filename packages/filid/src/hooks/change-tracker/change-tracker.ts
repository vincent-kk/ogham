/**
 * @deprecated Intentionally disabled — NOT dead code.
 *
 * This module implements PostToolUse change tracking (Write/Edit → .filid/change-log.jsonl).
 * Currently disabled in hooks.json because ChangeQueue cannot persist across hook invocations
 * (each hook call runs in a separate process). The entry stub uses a no-op queue as workaround.
 *
 * Retained for future activation when a persistent queue mechanism is available.
 * Do NOT delete or flag as dead code during plugin validation.
 */
import type {
  ChangeQueue,
  ChangeRecord,
} from '../../core/infra/change-queue/change-queue.js';
import type { HookOutput, PostToolUseInput } from '../../types/hooks.js';
import { validateCwd } from '../utils/validate-cwd.js';

import {
  type ChangeLogEntry,
  appendChangeLog,
} from './utils/append-change-log.js';
import { classifyPathCategory } from './utils/classify-path-category.js';

/**
 * PostToolUse hook: track file changes for PR-time batch sync.
 *
 * After Write or Edit tool calls, enqueue the changed file path
 * into the ChangeQueue and append a categorized entry to
 * .filid/change-log.jsonl.
 *
 * Write → changeType 'created', Edit → changeType 'modified'.
 */
export function trackChange(
  input: PostToolUseInput,
  queue: ChangeQueue,
): HookOutput {
  const safeCwd = validateCwd(input.cwd);
  if (safeCwd === null) return { continue: true };

  // Only track Write and Edit mutations
  if (input.tool_name !== 'Write' && input.tool_name !== 'Edit') {
    return { continue: true };
  }

  const filePath = input.tool_input.file_path ?? input.tool_input.path ?? '';

  // Skip if no file path provided
  if (!filePath) {
    return { continue: true };
  }

  const cwd = safeCwd;
  const toolName = input.tool_name;

  // 기존 ChangeQueue enqueue 로직 (변경 없음)
  const changeType: ChangeRecord['changeType'] =
    toolName === 'Write' ? 'created' : 'modified';
  queue.enqueue({ filePath, changeType });

  // 카테고리 판별
  const category = classifyPathCategory(filePath, cwd);

  const timestamp = new Date().toISOString();
  const entry: ChangeLogEntry = {
    timestamp,
    action: toolName,
    path: filePath,
    category,
    sessionId: input.session_id,
  };

  // .filid/change-log.jsonl에 기록
  appendChangeLog(cwd, entry);

  // 디버그 모드에서만 additionalContext 주입
  if (process.env['FILID_DEBUG'] === '1') {
    const tag = `[filid:change] ${timestamp} ${toolName} ${filePath} ${category}`;
    return {
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: tag,
      },
    };
  }

  return { continue: true };
}
