# Task 07: Hook advisory 메시지 컨텍스트 오염 감소

## Problem

매 MCP 변경 도구 호출마다 3개 PostToolUse 훅이 실행되며,
`index-invalidator`가 stale-node advisory 메시지를 conversation에 주입한다.
소규모 변경에서도 메시지가 발생하여 불필요한 컨텍스트 소비가 발생한다.

## Files

- `src/hooks/index-invalidator/index-invalidator.ts:65-76` — `buildAdvisoryMessage` 함수

## Steps

1. `buildAdvisoryMessage`에서 stale 비율이 낮을 때(예: stale 1-2개 또는 10% 미만)
   advisory 메시지를 suppress하도록 조건 추가
2. 높은 비율(예: 15%+)에서만 사용자에게 `kg_build` 권고 메시지 표시
3. 기존 테스트(`src/__tests__/unit/insight-injector.test.ts` 등) 업데이트

## Verify

```bash
yarn maencof test:run 2>&1 | tail -10
```

테스트 통과 + 소규모 변경 시 advisory 미출력 확인.
