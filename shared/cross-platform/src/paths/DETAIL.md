# paths — Contract

## Requirements

- OS 별 config·cache 위치는 `env-paths` 에 위임한다. 여기서 플랫폼 분기를 다시 만들지 않는다.
- 호스트 좌표는 `hostRegistry` 의 테이블에서 읽는다. 이 모듈이 호스트 목록을 중복 선언하지 않는다.
- 사용자 상태 루트는 해당 호스트의 relocation env 를 먼저 본다.
- containment 는 입력 단계에서 절대 세그먼트와 모든 `..` 구성요소를 거부하고, 결과가 루트의 descendant 인지 다시 확인한다. 상대 프로젝트 루트나 루트 밖 결과를 반환하지 않는다.
- 외부 소비자는 path 심볼을 `@ogham/cross-platform` 패키지 루트에서 가져온다.
- hook 출력 격리는 `sideEffects: false` tree-shaking 뒤 emitted byte cap과
  `FORBIDDEN_PATTERNS` 검사로 확인한다.

## API Contracts

경로 함수의 공개 형태는 진입점에서 확인한다. 객체형 facade를 통한 내부 사용과 외부 패키지 루트 계약을 혼동하지 않는다.

## Acceptance Criteria

### AC-root-output-isolation — 루트 공개 주소와 출력 격리

- 외부 import 주소는 `@ogham/cross-platform` 하나다.
- hook 번들은 사용하지 않는 path 구현을 emitted output에 남기지 않고 byte cap과
  `FORBIDDEN_PATTERNS` 검사를 통과한다.

## Boundary Exemptions

### `state` — 내부 좌표 소유권 유지

- **Consumers**: `**/src/hooks/**`, `**/src/configScope/**`
- **Direct import**: `allowed`
- **Reason**: `hooks` 와 `configScope` 는 같은 패키지 안에서 상태 좌표 파생을
  재사용한다. 좌표 소유권을 이 fractal 에 유지하고 패키지 구현이 자기 공개
  루트를 역참조하지 않도록 concrete state operation 을 직접 가져온다. 외부
  소비자는 패키지 루트만 사용하며, hook 격리는 tree-shaking 뒤 emitted output
  가드로 검증한다.

## Last Updated

호스트 상태 좌표·containment 또는 내부 재사용 예외의 범위가 바뀔 때 갱신한다.
