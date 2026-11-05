# contextInjector

## Requirements

- 세션 컨텍스트는 세션 한 번, turn 컨텍스트는 매 prompt에 주입한다. 첫 prompt의 KG·identity·지시문과 매 턴의 요약 책임을 혼합하지 않는다.
- L5 buffer 인박스 카운트는 미분류 항목 triage를 유도하는 세션 1회 넛지다. 빈 인박스에는 안내를 생략한다.
- stale 카운트·freshness·advisory 같은 인덱서 내부 상태는 주입하지 않는다. 신선도는 MCP의 cache·partial reindex가 소유한다.
- turn 컨텍스트 빌더와 캐시는 MCP와 공유하는 core를 사용한다. 훅 안에 복제하면 두 소비 경로의 의미가 갈라진다.

## API Contracts

독립 브리지 없이 UserPromptSubmit 관심사로 실행한다. turn 빌더와 캐시는 MCP와 같은 core 구현을 사용해 두 경로의 컨텍스트가 갈라지지 않게 한다. 관심사 밖으로 전파되는 I/O 실패는 호출자의 `safeConcern`이 로그로 격리한다. 이 호출 경계를 유지해 컨텍스트 주입 실패가 다른 관심사나 턴 진행을 막지 않게 한다.

## Acceptance Criteria

### AC-no-indexer-state — 인덱서 상태 비노출

- 주입 문자열에 stale 카운트·freshness 비율·advisory 분기가 없다.

## Boundary Exemptions

### `contextInjector.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. UserPromptSubmit orchestrator 가 이 파일을 직접 가져오는 것이 설계된 형태이고, 배럴 경유는 43008 바이트 캡을 잠식한다 — 같은 번들이 insightInjector·sessionTouch·vaultCommitter 도 싣는다.

## Last Updated

세션·턴 컨텍스트의 주입 범위, L5 인박스 안내 또는 인덱서 상태 비노출 계약이 바뀔 때 갱신한다.
