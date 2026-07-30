import { toolError } from './toolError.js';
import { toolResult } from './toolResult.js';

/** 요청 컨텍스트에서 이 래퍼가 쓰는 부분 — MCP SDK 가 넘기는 `extra` 의 부분집합. */
interface RequestContext {
  /**
   * 호스트가 `notifications/cancelled` 를 보내면 SDK 가 abort 시키는 신호.
   * 도구가 외부 CLI 를 띄웠다면 이 신호가 유일한 조기 종료 경로다.
   */
  signal?: AbortSignal;
}

/**
 * MCP 도구 핸들러를 감싸 정상 반환은 `toolResult`, throw 는 `toolError` 로 만든다.
 *
 * 두 번째 인자는 SDK 가 요청마다 만드는 컨텍스트이며, 그 안의 취소 신호를 핸들러에
 * 그대로 전달한다 — 이 전달이 빠지면 호스트가 요청을 취소해도 핸들러가 띄운
 * provider CLI 는 아무도 기다리지 않는 채로 liveness 상한까지 계속 돈다.
 *
 * @param handler 도구 본체. 취소를 다루지 않는 핸들러는 두 번째 인자를 선언하지
 *   않으면 되고, 그 경우에도 감싸는 동작은 같다.
 * @returns `registerTool` 에 그대로 넘길 콜백. 컨텍스트 없이 불러도 동작한다.
 */
export function wrapHandler<T>(
  handler: (args: T, signal?: AbortSignal) => unknown | Promise<unknown>,
): (
  args: T,
  extra?: RequestContext,
) => Promise<ReturnType<typeof toolResult> | ReturnType<typeof toolError>> {
  return async (args: T, extra?: RequestContext) => {
    try {
      return toolResult(await handler(args, extra?.signal));
    } catch (error) {
      return toolError(error);
    }
  };
}
