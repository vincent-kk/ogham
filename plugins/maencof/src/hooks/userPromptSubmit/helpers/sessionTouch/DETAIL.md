# sessionTouch — Contract

## Requirements

- `isMaencofVault` 와 `session_id` 존재를 게이트로 둔다. 둘 중 하나가 없으면 아무 일도 하지 않는다.
- 레코드 변경은 전부 `core/sessionStore` 의 `touchSessionActivity` 에 위임한다. 여기서 일자 파일을 직접 만지지 않는다.
- 세션을 닫지 않는다. `endedAt` 은 sweep·shutdown 의 소관이다.
- 사용자에게 보이는 출력을 내지 않는다. 부수효과 전용이다.

## API Contracts

레코드 변경은 sessionStore가 소유한다. 이 관심사는 매 턴 활동 재료만 기록하고 세션 마감과 사용자 알림은 수행하지 않는다.

## Acceptance Criteria

### AC-never-closes — 마감 금지

- 이 경로가 `endedAt` 을 쓰지 않는다.

### AC-silent — 무출력

- 사용자에게 보이는 출력이 없다.

## Boundary Exemptions

### `sessionTouch.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 이 fractal 은 배럴이 없고 매 턴 UserPromptSubmit orchestrator 만 소비하므로, concrete 경로가 유일하고 의도된 진입이다.

## Last Updated

활동 기록의 sessionStore 위임, 세션 마감 금지 또는 사용자 무출력 경계가 바뀔 때 갱신한다.
