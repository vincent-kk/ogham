import { type StoppedRun, stopRuns } from '../../../dispatcher/index.js';
import type { Provider } from '../../../types/index.js';

export interface StopConversationInput {
  /** 이 cennad 세션의 실행만 중단한다. 생략하면 세션을 가리지 않는다. */
  session_id?: string;
  /** 이 provider 의 실행만 중단한다. 생략하면 provider 를 가리지 않는다. */
  provider?: Provider;
}

export interface StopConversationOutput {
  /** 실제로 죽인 실행 목록. 아무것도 없으면 빈 배열. */
  stopped: StoppedRun[];
  /** `stopped` 의 길이 — 호출자가 배열을 세지 않아도 되도록 함께 싣는다. */
  count: number;
  /** 결과를 사람이 읽는 한 줄. `count: 0` 이 왜 실패가 아닌지도 여기서 말한다. */
  message: string;
}

/**
 * 실행 중인 provider CLI 를 강제 종료한다.
 *
 * 두 필터 모두 생략하면 이 MCP 서버 프로세스(= 이 Claude 세션)가 띄운 실행을
 * 전부 죽인다. 종료는 프로세스 그룹 SIGKILL 이라 CLI 가 만든 자식까지 함께
 * 정리되며, 진행 중이던 작업과 부분 출력은 회수되지 않는다.
 *
 * @param input 중단 대상을 좁히는 필터. 두 필터를 함께 주면 둘 다 만족하는 실행만
 *   대상이 된다.
 * @returns 죽인 실행 목록과 개수, 그리고 그 결과를 설명하는 한 줄.
 */
export function handleStopConversation(
  input: StopConversationInput,
): StopConversationOutput {
  const stopped = stopRuns({
    sessionId: input.session_id,
    provider: input.provider,
  });
  return {
    stopped,
    count: stopped.length,
    message:
      stopped.length > 0
        ? `Stopped ${stopped.length} running provider CLI call(s). Their work is lost and no partial output was kept.`
        : 'No matching run was in flight — it had already finished, or it was started by a different session. Nothing was killed.',
  };
}
