# injectDynamic — Contract

## Requirements

- provider가 활성이고 세션이 식별된 프롬프트의 라이브 상태는 기본 2줄, 자동 지목 대상 키워드가 매치될 때만 3줄로 제한한다.
- 모든 provider가 비활성이면 설정 안내 한 줄만 출력한다. 그 외 식별 불가 상태에서는 유효한 측정 정보가 없으므로 payload를 생략한다.
- **매 턴 주입이므로 토큰 점유 최소화가 제1 제약이다.** 줄 수를 늘리지 않는다.
- 식별 불가는 payload 생략으로, counter 파일 부재·세션 불일치·잘못된 counter는 상태줄로 구분하여 측정 불가를 실제 0회로 보고하지 않는다.
- counter 는 **읽기 전용**이다 — 리셋은 `counterManager` 의 책임이다.
- 세션을 차단하지 않는다.

## API Contracts

- UserPromptSubmit의 `additionalContext`는 상태별 생략·축약 규칙을 지켜 무정보 문구가 매 턴 토큰을 차지하지 않게 한다.

## Acceptance Criteria

### AC-counter-readonly — 카운터 읽기 전용

- 훅 실행이 세션 카운터 저장 파일을 쓰지 않는다.
- 식별자가 없거나 디스크 식별자가 다르면 실제 0회 문구를 출력하지 않는다.

### AC-counter-measurement-matrix — 측정 상태 구분

- 식별자 부재, 파일 부재, stale·invalid 자료, 일치하는 식별자의 0/0/0, Claude legacy PID를 서로 구분한다.
- 식별자 부재(`unidentified`)는 무정보 동적 payload를 생략하고, `missing|stale|invalid`와 measured 상태는 기존 상태줄을 유지한다.

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

측정 상태 구분·주입 예산·카운터 읽기 경계의 내용이나 적용 범위가 바뀔 때 갱신한다.
