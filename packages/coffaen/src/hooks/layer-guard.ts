/**
 * @file layer-guard.ts
 * @description PreToolUse Hook — Layer 1 (01_Core/) 파일 수정 시 경고 출력
 * identity-guardian 에이전트를 통한 수정 안내
 */

import { isLayer1Path, isCoffaenVault } from './shared.js';

export interface PreToolUseInput {
  tool_name?: string;
  tool_input?: {
    file_path?: string;
    path?: string;
    [key: string]: unknown;
  };
  cwd?: string;
}

export interface PreToolUseResult {
  continue: boolean;
  /** 차단 시 사용자에게 출력할 메시지 */
  reason?: string;
}

/**
 * Layer Guard Hook 핸들러.
 * Write/Edit 도구로 Layer 1 (01_Core/) 파일을 수정하려 할 때 경고를 출력한다.
 * coffaen vault가 아닌 경우 무조건 통과.
 */
export function runLayerGuard(input: PreToolUseInput): PreToolUseResult {
  const cwd = input.cwd ?? process.cwd();

  // coffaen vault가 아니면 무조건 통과
  if (!isCoffaenVault(cwd)) {
    return { continue: true };
  }

  const filePath = input.tool_input?.file_path ?? input.tool_input?.path ?? '';
  if (!filePath) {
    return { continue: true };
  }

  if (isLayer1Path(filePath)) {
    return {
      continue: false,
      reason: [
        `[coffaen] Layer 1 (01_Core/) 파일은 직접 수정이 제한됩니다.`,
        `파일: ${filePath}`,
        ``,
        `Layer 1 문서는 핵심 정체성(Hub 노드)을 담습니다. 수정이 필요한 경우:`,
        `  1. identity-guardian 에이전트를 통해 수정 요청 (자동 위임됨)`,
        `  2. 또는 충분한 이유를 설명 후 재시도`,
      ].join('\n'),
    };
  }

  return { continue: true };
}
