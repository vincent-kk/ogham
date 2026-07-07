/**
 * @file activityRecorder.ts
 * @description PostToolUse Hook — write 도구 호출 시 활동 로그(NDJSON)에 자동 기록
 *
 * matcher: `create`|`update`|`delete`|`move`|`capture_insight`|`claudemd_merge`|`claudemd_remove` (write 도구)
 * graceful degradation: 모든 에러 catch → { continue: true }
 *
 * P4 — self-reference guard: maencof 가 자동 관리하는 경로(.maencof / .maencof-meta /
 * changelog / 볼트 dailynotes)에 대한 write 는 기록하지 않는다. 기록하면 append 가
 * 또 다른 write 이벤트를 유발해 엔트리가 무한 복제된다.
 */
import { TOOL_CATEGORY_MAP } from '../../../../constants/activity.js';
import { ACTIVITY_RECORDER_EXCLUSION_PREFIXES } from '../../../../constants/activityRecorder.js';
import { appendActivityEvent } from '../../../../core/activityLog/activityLog.js';
import { buildToolDescription } from '../../../../core/activityLog/buildToolDescription.js';
import { formatTime } from '../../../../core/dateFormat/dateFormat.js';
import { appendErrorLogSafe } from '../../../../core/errorLog/errorLog.js';
import { isMaencofVault } from '../../../shared/isMaencofVault.js';
import { normalizeMaencofToolName } from '../../../shared/maencofMcpTools.js';

function isExcludedPath(path: string | undefined): boolean {
  if (!path) return false;
  return ACTIVITY_RECORDER_EXCLUSION_PREFIXES.some((prefix) =>
    path.startsWith(prefix),
  );
}

export interface ActivityRecorderInput {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: Record<string, unknown>;
  cwd?: string;
  session_id?: string;
}

export interface ActivityRecorderResult {
  continue: boolean;
}

/**
 * Activity Recorder Hook handler.
 * PostToolUse에서 maencof write 도구 호출 시 활동 로그에 자동 기록.
 */
export function runActivityRecorder(
  input: ActivityRecorderInput,
): ActivityRecorderResult {
  try {
    const cwd = input.cwd ?? process.cwd();
    // Hook inputs carry full-form MCP names (mcp__plugin_maencof_t__create);
    // category map and description builder are keyed on bare names.
    const toolName = normalizeMaencofToolName(input.tool_name ?? '');

    if (!isMaencofVault(cwd)) return { continue: true };

    const category = TOOL_CATEGORY_MAP[toolName];
    if (!category) return { continue: true };

    const toolInput = input.tool_input ?? {};
    const description = buildToolDescription(toolName, toolInput);
    const path =
      (toolInput['path'] as string) ??
      (toolInput['file_path'] as string) ??
      extractPathFromResponse(input.tool_response) ??
      undefined;

    // P4: maencof 자체 관리 경로에 대한 write 는 skip — 그렇지 않으면 append 자체가
    // 재귀적으로 append 를 유발한다.
    if (isExcludedPath(path)) return { continue: true };

    appendActivityEvent(cwd, {
      time: formatTime(new Date()),
      category,
      description,
      path,
    });
  } catch (e) {
    appendErrorLogSafe(input.cwd ?? process.cwd(), {
      hook: 'activity-recorder',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
  }

  return { continue: true };
}

/**
 * tool_response에서 결과 path를 추출한다.
 * create 등에서 path가 tool_input이 아닌 response에 있을 수 있음.
 */
function extractPathFromResponse(
  response: Record<string, unknown> | undefined,
): string | null {
  if (!response) return null;
  try {
    if (typeof response['path'] === 'string' && response['path'])
      return response['path'];

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
