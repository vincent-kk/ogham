/**
 * @file dailynote-recorder.ts
 * @description PostToolUse Hook — write 도구 호출 시 dailynote에 자동 기록
 *
 * matcher: maencof_create|maencof_update|maencof_delete|maencof_move|claudemd_merge (write 도구 5개)
 * graceful degradation: 모든 에러 catch → { continue: true }
 */
import {
  appendDailynoteEntry,
  buildToolDescription,
  formatTime,
} from '../core/dailynote-writer.js';
import { TOOL_CATEGORY_MAP } from '../types/dailynote.js';

import { isMaencofVault } from './shared.js';

export interface DailynoteRecorderInput {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: Record<string, unknown>;
  cwd?: string;
  session_id?: string;
}

export interface DailynoteRecorderResult {
  continue: boolean;
}

/**
 * Dailynote Recorder Hook handler.
 * PostToolUse에서 maencof write 도구 호출 시 dailynote 파일에 자동 기록.
 */
export function runDailynoteRecorder(
  input: DailynoteRecorderInput,
): DailynoteRecorderResult {
  try {
    const cwd = input.cwd ?? process.cwd();
    const toolName = input.tool_name ?? '';

    if (!isMaencofVault(cwd)) {
      return { continue: true };
    }

    const category = TOOL_CATEGORY_MAP[toolName];
    if (!category) {
      return { continue: true };
    }

    const toolInput = input.tool_input ?? {};
    const description = buildToolDescription(toolName, toolInput);
    const path =
      (toolInput['path'] as string) ??
      (toolInput['file_path'] as string) ??
      extractPathFromResponse(input.tool_response) ??
      undefined;

    appendDailynoteEntry(cwd, {
      time: formatTime(new Date()),
      category,
      description,
      path,
    });
  } catch {
    // Graceful degradation — dailynote 기록 실패는 원래 동작에 영향 없음
  }

  return { continue: true };
}

/**
 * tool_response에서 결과 path를 추출한다.
 * maencof_create 등에서 path가 tool_input이 아닌 response에 있을 수 있음.
 */
function extractPathFromResponse(
  response: Record<string, unknown> | undefined,
): string | null {
  if (!response) return null;
  try {
    if (typeof response['path'] === 'string' && response['path']) {
      return response['path'];
    }
    const content = response['content'];
    if (Array.isArray(content) && content.length > 0) {
      const first = content[0] as { type?: string; text?: string };
      if (first.type === 'text' && first.text) {
        const parsed = JSON.parse(first.text) as { path?: string };
        if (typeof parsed.path === 'string' && parsed.path) return parsed.path;
      }
    }
  } catch {
    /* ignore parse failures */
  }
  return null;
}
