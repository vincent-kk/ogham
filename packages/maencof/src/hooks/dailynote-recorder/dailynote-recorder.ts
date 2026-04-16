/**
 * @file dailynote-recorder.ts
 * @description PostToolUse Hook — write 도구 호출 시 dailynote에 자동 기록
 *
 * matcher: `create`|`update`|`delete`|`move`|`capture_insight`|`claudemd_merge`|`claudemd_remove` (write 도구 7개)
 * graceful degradation: 모든 에러 catch → { continue: true }
 *
 * P4 — self-reference guard: 자기 자신(dailynote)이나 changelog 등 maencof 가 자동
 * 관리하는 경로에 대한 write 는 dailynote 에 기록하지 않는다. 기록하면 매 dailynote
 * append 가 또 다른 dailynote 이벤트를 유발해 엔트리가 무한 복제된다.
 */
import {
  appendDailynoteEntry,
  buildToolDescription,
  formatTime,
} from '../../core/dailynote-writer/index.js';
import { TOOL_CATEGORY_MAP } from '../../types/dailynote.js';

import { appendErrorLogSafe } from '../../core/error-log/index.js';
import { isMaencofVault } from '../shared/index.js';

/**
 * Paths whose writes MUST NOT be recorded in dailynote — maencof 자체 관리 영역.
 *
 * - `02_Derived/changelog/` : changelog 디렉토리 (self-reference 방지)
 * - `02_Derived/dailynotes/` : dailynote 디렉토리 자체 (무한 재귀 방지)
 * - `.maencof/` : 그래프 인덱스, stale-nodes 등
 * - `.maencof-meta/` : 운영 메타데이터 (session, config, dailynote 원본 포함)
 *
 * startsWith 매칭이므로 경로는 prefix 로 사용된다.
 */
const EXCLUSION_PATH_PREFIXES: readonly string[] = [
  '02_Derived/changelog/',
  '02_Derived/dailynotes/',
  '.maencof/',
  '.maencof-meta/',
];

function isExcludedPath(path: string | undefined): boolean {
  if (!path) return false;
  return EXCLUSION_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

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

    // P4: maencof 자체 관리 경로(dailynote/changelog/.maencof-meta/.maencof)에
    // 대한 write 는 skip — 그렇지 않으면 append 자체가 재귀적으로 append 를 유발한다.
    if (isExcludedPath(path)) {
      return { continue: true };
    }

    appendDailynoteEntry(cwd, {
      time: formatTime(new Date()),
      category,
      description,
      path,
    });
  } catch (e) {
    appendErrorLogSafe(input.cwd ?? process.cwd(), { hook: 'dailynote-recorder', error: String(e), timestamp: new Date().toISOString() });
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
