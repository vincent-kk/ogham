# injectDynamic — Contract

## Requirements

- 매 사용자 프롬프트마다 stdin 의 `prompt`, `runtime/counter.json`, `config.json` 을 읽어 **2–3줄**을 출력한다: 호출 카운트와 점유율 미달 provider 한 줄, 강도별 nudge 한 줄, 키워드가 매치된 턴에만 소유자 지목 한 줄.
- **매 턴 주입이므로 토큰 점유 최소화가 제1 제약이다.** 줄 수를 늘리지 않는다.
- counter 가 없거나 `parent_pid` 가 현재 호스트와 다르면 0으로 표시한다.
- counter 는 **읽기 전용**이다 — 리셋은 `counterManager` 의 책임이다.
- 세션을 차단하지 않는다.

## API Contracts

- UserPromptSubmit 처리 — 2–3줄의 `additionalContext` 를 주입한다.

## Acceptance Criteria

### AC-line-budget — 줄 수 예산

- 주입이 3줄을 넘지 않는다.
- 키워드 미매치 턴에는 소유자 지목 줄이 나오지 않는다.

### AC-counter-readonly — 카운터 읽기 전용

- 훅 실행이 `runtime/counter.json` 을 쓰지 않는다.
- `parent_pid` 불일치 시 0으로 표시된다.

## Boundary Exemptions

### injectDynamic.ts — E2E Layer A runs the hook in-process

- **Consumers**: `**/src/__tests__/**`
- **Direct import**: allowed
- **Reason**: e2e Layer A 는 훅을 번들 대신 in-process 로 실행해 payload 를 검사한다. 이 훅에는 배럴이 없고 있어서도 안 된다 — 번들 진입점이 배럴을 거치면 esbuild 가 재노출 그래프를 끌어와 크기 캡을 넘긴다.

### utils — E2E Layer A reads the same counter loader

- **Consumers**: `**/src/__tests__/**`
- **Direct import**: allowed
- **Reason**: 위와 같은 이유다. 테스트가 훅과 다른 로더를 쓰면 검사하는 대상이 실제로 배송되는 코드가 아니게 된다.

## Last Updated

2026-07-30 — 매 턴 동적 주입의 예산 계약과 e2e in-process 실행 면책을 문서화했다.
