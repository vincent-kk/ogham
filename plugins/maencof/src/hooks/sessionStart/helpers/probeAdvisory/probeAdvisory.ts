/**
 * @file probeAdvisory.ts
 * @description selfProbe 결과를 세션 시작 진단 경고로 필터/조립.
 *
 * `${CLAUDE_PLUGIN_ROOT}` 는 hooks.json 명령 문자열 치환으로 소비되고 훅 프로세스
 * env 에는 존재하지 않는 것이 정상 동작이다. env 부재를 경고로 승격하면 훅이 멀쩡히
 * 도는 세션마다 거짓 "some hooks may not work" 가 주입되므로 advisory 대상에서
 * 제외한다 (node/git/PATH 실패만 실제 행동 가능 신호).
 */
import { errorLogPath } from '@ogham/cross-platform/error-log';

const IGNORED_PROBE_ERRORS = new Set(['CLAUDE_PLUGIN_ROOT not set']);

export interface ProbeAdvisory {
  /** Errors worth logging and surfacing (false positives removed). */
  actionable: string[];
  /** Claude-facing advisory text, or null when nothing actionable remains. */
  advisory: string | null;
}

export function buildProbeAdvisory(errors: string[]): ProbeAdvisory {
  const actionable = errors.filter((error) => !IGNORED_PROBE_ERRORS.has(error));
  if (actionable.length === 0) return { actionable, advisory: null };
  return {
    actionable,
    advisory:
      '[maencof] hook bootstrap diagnostic — some hooks may not work:\n' +
      actionable.map((e) => `  - ${e}`).join('\n') +
      `\nSee ${errorLogPath('maencof')} for details.`,
  };
}
