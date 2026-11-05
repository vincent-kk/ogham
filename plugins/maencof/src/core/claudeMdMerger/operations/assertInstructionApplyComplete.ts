import type { InstructionSectionApplyResult } from '@ogham/agent-artifacts';

/**
 * 부분 적용을 정상 무변경으로 축소하지 않고 기존 오류 경로로 전달한다.
 * @param result - instruction manager가 반환한 실제 적용 결과
 * @returns 부분 적용이 없으면 그대로 계속한다.
 * @throws 부분 적용 시 복구 내역을 JSON 메시지에, 원래 결과를 cause에 담은 오류
 */
export function assertInstructionApplyComplete(
  result: InstructionSectionApplyResult,
): void {
  if (!result.outcomes.some((outcome) => outcome.action === 'partial')) return;
  throw new Error(
    JSON.stringify({
      status: 'partial',
      partialFailures: result.partialFailures ?? [],
    }),
    { cause: result },
  );
}
