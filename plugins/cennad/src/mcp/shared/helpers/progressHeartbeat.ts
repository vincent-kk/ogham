import type { ServerNotification } from '@modelcontextprotocol/sdk/types.js';

/**
 * 하트비트 간격. 호스트의 stdio idle 한도(기본 30 분)보다 크게 짧게 잡아,
 * 사용자가 그 한도를 줄여 두었더라도 여유가 남게 한다.
 */
const HEARTBEAT_INTERVAL_MS = 60_000;

/** 이 헬퍼가 쓰는 요청 컨텍스트 조각 — SDK `extra` 의 부분집합. */
export interface ProgressContext {
  /** 원 요청의 메타데이터. 호스트가 progress 를 원할 때 토큰이 실린다. */
  _meta?: { progressToken?: string | number };
  /** 이 요청에 묶인 notification 전송기. transport 가 짝을 맞춘다. */
  sendNotification?: (notification: ServerNotification) => Promise<void>;
}

/**
 * 실행이 끝날 때까지 주기적으로 progress notification 을 보내 호출이 idle 로
 * 판정되지 않게 한다.
 *
 * 호스트는 응답도 progress 도 없이 idle 한도를 넘긴 도구 호출을 중단시킨다.
 * provider CLI 는 tier 에 따라 몇 시간을 돌 수 있고 그동안 이 서버는 아무것도
 * 보내지 않으므로, 하트비트가 없으면 긴 위임이 답을 내기 전에 잘린다. 벽시계
 * 한도는 이것으로 늘어나지 않는다 — idle 판정만 막는다.
 *
 * @param ctx 요청 컨텍스트. `progressToken` 이나 `sendNotification` 이 없으면
 *   호스트가 progress 를 받을 수 없다는 뜻이므로 아무것도 하지 않는다.
 * @returns 하트비트를 멈추는 함수. 호출자는 성공·실패와 무관하게 반드시 부른다.
 */
export function startProgressHeartbeat(ctx: ProgressContext): () => void {
  const token = ctx._meta?.progressToken;
  const send = ctx.sendNotification;
  if (token === undefined || send === undefined) return () => {};

  let progress = 0;
  const timer = setInterval(() => {
    progress += 1;
    // 전송 실패는 하트비트를 멈출 이유가 아니다 — 도구 본체는 계속 돌고 있고,
    // 다음 박동이 성공하면 idle 판정은 여전히 밀린다.
    void send({
      method: 'notifications/progress',
      params: { progressToken: token, progress },
    }).catch(() => {});
  }, HEARTBEAT_INTERVAL_MS);
  // 하트비트만 남아 프로세스를 붙잡고 있지 않게 한다.
  timer.unref();

  return () => {
    clearInterval(timer);
  };
}
