# injectDynamic — Contract

## Requirements

- 매 사용자 프롬프트마다 stdin의 prompt, 세션 카운터 저장소, 구성 저장소를 읽어 **2–3줄**을 출력한다: 호출 카운트와 점유율 미달 provider 한 줄, 강도별 nudge 한 줄, 키워드가 매치된 턴에만 소유자 지목 한 줄.
- **매 턴 주입이므로 토큰 점유 최소화가 제1 제약이다.** 줄 수를 늘리지 않는다.
- 호스트 세션 식별 불가, counter 파일 부재, 세션 불일치·잘못된 counter, 식별된 실제 0회를 서로 다른 상태로 표시한다.
- counter 는 **읽기 전용**이다 — 리셋은 `counterManager` 의 책임이다.
- 세션을 차단하지 않는다.

## API Contracts

- UserPromptSubmit 처리 — 2–3줄의 `additionalContext` 를 주입한다.

## Acceptance Criteria

### AC-line-budget — 줄 수 예산

- 주입이 3줄을 넘지 않는다.
- 키워드 미매치 턴에는 소유자 지목 줄이 나오지 않는다.

### AC-counter-readonly — 카운터 읽기 전용

- 훅 실행이 세션 카운터 저장 파일을 쓰지 않는다.
- 식별자가 없거나 디스크 식별자가 다르면 실제 0회 문구를 출력하지 않는다.

### AC-counter-measurement-matrix — 측정 상태 구분

- 식별자 부재, 파일 부재, stale·invalid 자료, 일치하는 식별자의 0/0/0, Claude legacy PID를 서로 구분한다.

### AC-counter-session-topology — 세션 토폴로지

- 명시 세션 식별자를 공유하는 direct bundle과 `libs/run.cjs` 경유 bundle이 동일한 카운트를 출력한다.

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

2026-08-23 — 세션 식별·파일 부재·실제 0회를 구분하는 카운터 측정 계약을 추가했다.
