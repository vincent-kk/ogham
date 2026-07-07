/**
 * @file sessionRecap.ts
 * @description Stop Hook — 세션당 1회, pending insight 캡처를 recap으로 Claude에 주입.
 *
 * SessionEnd 는 표시가 보장되는 출력 채널이 없어(hooks 계약) recap 발화 지점을
 * Stop 으로 옮겼다. Stop 은 응답마다 발화하므로 cacheManager 의 recap 마커로
 * 세션당 1회로 제한하고, 보고할 캡처가 없으면 침묵한다(노이즈 방지).
 */
import {
  hasRecapMarker,
  markRecapEmitted,
} from '../../../../core/cacheManager/cacheManager.js';
import { isSessionRecapDisabled } from '../../../../core/dialogueConfig/dialogueConfig.js';
import { appendErrorLogSafe } from '../../../../core/errorLog/errorLog.js';
import { readPendingNotification } from '../../../../core/insightStats/insightStats.js';
import { isMaencofVault } from '../../../shared/isMaencofVault.js';

export interface SessionRecapInput {
  session_id?: string;
  cwd?: string;
}

export interface SessionRecapResult {
  continue: boolean;
  hookSpecificOutput?: {
    hookEventName: 'Stop';
    additionalContext: string;
  };
}

/**
 * Session Recap Stop concern.
 * 이번 세션에서 자동 캡처된 인사이트(합의 전제 L5 / 잠정 원칙 L2)를 한 번 요약해
 * `hookSpecificOutput.additionalContext`(Stop의 non-error feedback 채널)로 반환한다.
 */
export function runSessionRecap(input: SessionRecapInput): SessionRecapResult {
  try {
    const cwd = input.cwd ?? process.cwd();
    if (!isMaencofVault(cwd)) return { continue: true };
    if (isSessionRecapDisabled(cwd)) return { continue: true };

    const sessionId = input.session_id ?? '';
    if (!sessionId) return { continue: true };
    if (hasRecapMarker(sessionId, cwd)) return { continue: true };

    const pending = readPendingNotification(cwd);
    const captures = pending?.captures ?? [];
    if (captures.length === 0) return { continue: true };

    const recap = buildRecapText(captures);
    markRecapEmitted(sessionId, cwd);
    return {
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'Stop',
        additionalContext: recap,
      },
    };
  } catch (e) {
    appendErrorLogSafe(input.cwd ?? process.cwd(), {
      hook: 'session-recap',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
    return { continue: true };
  }
}

interface RecapCapture {
  layer?: number;
  title?: string;
}

/**
 * finalize 시절의 recap 구성을 유지한다: L5 캡처 → 합의 전제, L2 캡처 → 잠정 원칙.
 */
function buildRecapText(captures: RecapCapture[]): string {
  const agreedPremises = captures
    .filter((c) => c.layer === 5)
    .map((c) => `  - ${c.title}`);
  const tentativePrinciples = captures
    .filter((c) => c.layer === 2)
    .map((c) => `  - ${c.title}`);

  const lines: string[] = ['[maencof] Session Recap'];
  lines.push(
    `- Agreed premises:${agreedPremises.length > 0 ? '\n' + agreedPremises.join('\n') : ' (none)'}`,
  );
  lines.push(
    `- Tentative principles:${tentativePrinciples.length > 0 ? '\n' + tentativePrinciples.join('\n') : ' (none)'}`,
  );
  lines.push(
    'Surface this recap to the user. To persist it into the vault, run /maencof:remember.',
  );
  return lines.join('\n');
}
