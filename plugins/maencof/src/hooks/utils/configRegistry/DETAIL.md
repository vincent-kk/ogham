# configRegistry — Contract

## Requirements

- 레지스트리는 선언이다. 런타임에 항목을 추가하거나 값을 바꾸지 않는다 — 프로비저닝이 결정적이어야 같은 볼트에서 같은 기본값이 나온다.
- 파일명·기본값·마이그레이션 버전을 함께 선언해 프로비저닝 대상과 버전 판정이 갈라지지 않게 한다. 도메인 값 검증은 각 소비자가 소유하며, 버전 번호를 검증 스키마로 취급하지 않는다.
- 기본값을 바꿀 때는 여기를 먼저 고친다. 소비자 쪽에 리터럴을 복제하지 않는다.

## API Contracts

프로비저닝과 마이그레이션이 같은 설정 선언을 사용해야 한다. 도메인 검증을 이 레지스트리에 복제하거나 기본값 변경을 소비자 리터럴로 우회하지 않는다.

## Acceptance Criteria

### AC-registry-immutable — 런타임 불변

- 레지스트리 항목이 런타임에 변경되지 않는다.

### AC-single-default-source — 기본값 단일 출처

- 프로비저닝이 쓰는 기본값이 레지스트리에서만 온다.

## Boundary Exemptions

### `configRegistry.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 이 fractal 은 배럴과 구현이 1:1 이지만, 훅 도달 코드가 배럴을 거치지 않는 것이 이 저장소의 일관된 형태이고 배럴을 섞으면 번들 그래프가 파일마다 달라진다.

## Last Updated

설정 파일명·기본값·마이그레이션 버전의 소유권 또는 레지스트리의 런타임 불변 계약이 바뀔 때 갱신한다.
