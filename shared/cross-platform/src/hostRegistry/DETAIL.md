# hostRegistry — Contract

## Requirements

- 내부 의존이 없는 leaf 로 유지한다. 다른 내부 모듈을 import 하지 않고, 파일 I/O 도 `process` 직접 판독도 하지 않는다.
- 새 호스트는 조건문이 아니라 `HOSTS` 행으로 추가한다. 호스트 이름과 host-specific env 이름은 이 모듈이 선언한다.
- marker 가 있으면 훅 신호보다 우선한다. 미인식 marker 는 `unknown` 이다.
- 신호가 전혀 없으면 Claude, 서로 다른 훅 신호가 겹치면 `unknown` 이다. 미인식 호스트를 명시적 Claude 결과로 반환하지 않는다.
- 테이블에는 실측된 값만 둔다. agy 의 Claude 상태 채널 차용은 추론이 아니라 명시적 행으로 남긴다.

## API Contracts

- `HOSTS` — 호스트 행과 marker env 의 순수 데이터.
- `Host` · `KnownHost` · descriptor 타입.
- `hostFromMarker(env)` — MCP marker 판별.
- `runtime/` organ — marker·훅 신호에서 명시적 host ID 를 판별한다.
- `resolveHostDescriptor(...)` — 기존 상태 경로 호환용 descriptor 판별.
- 외부 소비자는 위 심볼을 `@ogham/cross-platform` 패키지 루트에서 가져온다.

## Acceptance Criteria

### AC-marker-precedence — marker 우선

- marker 가 있으면 훅 신호와 무관하게 marker 결과가 이긴다.

### AC-unknown-not-claude — unknown 보존

- 미인식 marker 나 겹치는 훅 신호가 `unknown` 으로 남고 Claude 로 낮춰지지 않는다.

### AC-leaf-no-internal-deps — leaf 유지

- 이 fractal 이 다른 내부 모듈을 import 하지 않는다.

## Boundary Exemptions

### `operations` — 내부 host 표 소유권 유지

- **Consumers**: `**/src/paths/state/**`
- **Direct import**: `allowed`
- **Reason**: `paths/state` 는 같은 패키지 안에서 host 표와 descriptor 판별을
  재사용한다. 좌표 파생의 소유권을 이 fractal 에 유지하고 패키지 구현이 자기
  루트를 역참조하지 않도록 concrete operation 을 직접 가져온다. 외부 공개 주소는
  패키지 루트 하나이며, hook 격리는 `sideEffects: false` tree-shaking 뒤 emitted
  byte cap 과 `FORBIDDEN_PATTERNS` 출력 검사로 검증한다.

## Last Updated

2026-07-30 — package root 단일 공개 주소와 내부 host 표 재사용 계약을 정리했다.
