# sessionTouch — Contract

## Requirements

- `isMaencofVault` 와 `session_id` 존재를 게이트로 둔다. 둘 중 하나가 없으면 아무 일도 하지 않는다.
- 레코드 변경은 전부 `core/sessionStore` 의 `touchSessionActivity` 에 위임한다. 여기서 일자 파일을 직접 만지지 않는다.
- 세션을 닫지 않는다. `endedAt` 은 sweep·shutdown 의 소관이다.
- 사용자에게 보이는 출력을 내지 않는다. 부수효과 전용이다.

## API Contracts

- `runSessionTouch(input)` — `SessionTouchResult`. `lastActivityAt`·`usageSnapshot` 을 갱신하고, sweep 이 오마감한 세션이면 다시 연다.
- 입력 `SessionTouchInput`, 출력 `SessionTouchResult`.

## Acceptance Criteria

### AC-gate-vault-and-session — 게이트

- 볼트가 아니거나 `session_id` 가 없으면 레코드가 변경되지 않는다.

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

2026-07-30 — 게이트·위임 계약과 훅 직접 import 면책을 문서화했다.
