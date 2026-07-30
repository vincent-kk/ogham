# configRegistry — Contract

## Requirements

- 레지스트리는 선언이다. 런타임에 항목을 추가하거나 값을 바꾸지 않는다 — 프로비저닝이 결정적이어야 같은 볼트에서 같은 기본값이 나온다.
- 각 항목은 경로·기본값·스키마를 함께 들고 있다. 세 조각이 흩어지면 프로비저닝과 검증이 어긋난다.
- 기본값을 바꿀 때는 여기를 먼저 고친다. 소비자 쪽에 리터럴을 복제하지 않는다.

## API Contracts

- `CONFIG_REGISTRY: ConfigEntry[]` — 설정 항목 배열. 각 항목이 파일 경로, 기본값, 스키마를 소유한다.
- `ConfigEntry` — 항목 형태.

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

2026-07-30 — 레지스트리 불변·기본값 단일 출처 계약과 훅 직접 import 면책을 문서화했다.
