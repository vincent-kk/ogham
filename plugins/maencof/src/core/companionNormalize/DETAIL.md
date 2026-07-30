# companionNormalize — Contract

## Requirements

- Zod 를 import 하지 않는다. 렌더 경로(`turnContext`)를 통해 훅 번들에 들어가므로 Zod 런타임이 크기 가드를 넘긴다.
- 순수 변환만 한다. 파일 읽기·쓰기는 호출자 몫이다.
- `name`·`greeting` 이 없으면 `null` 을 반환한다 — 부분 파일은 오류가 아니라 정규화 실패다.
- 레거시 v1 고정 필드(`role`·`personality`·`principles`·`taboos`·`origin`)는 균일 section 으로 매핑한다. `role` 이 코어였던 과도기 정본 파일은 `role` 을 section 으로 승격하고 중복을 만들지 않는다.
- section 의 `detail`·`brief` 는 문자열 또는 문자열 배열을 수용하고 배열 원형을 보존한다. join 은 렌더 시점(`turnContext` 의 `resolveSectionText`)의 일이다.

## API Contracts

- `normalizeCompanionIdentity(raw)` — 레거시·정본·부분 JSON → `CompanionIdentityMinimal`, 또는 `null`.
- `toIsoDatetime(value, fallback)` — 날짜 값을 ISO 문자열로. 해석 불가면 `fallback`.

## Acceptance Criteria

### AC-zod-free-kernel — Zod 없는 커널

- 이 fractal 의 어떤 파일도 zod 를 import 하지 않는다.

### AC-legacy-v1-mapping — 레거시 매핑

- v1 고정 필드가 section 으로 매핑되고, 과도기 정본의 `role` 이 중복 없이 승격된다.

### AC-array-detail-preserved — 배열 원형 보존

- 배열 `detail`·`brief` 가 배열로 남는다.

## Boundary Exemptions

### `normalizeCompanionIdentity.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 배럴을 거치면 재노출 그래프 전체가 번들에 끌려 들어와 가드를 넘긴다 — 배럴 경유는 선택지가 아니라 빌드 실패다. 레거시→정본 매핑은 렌더·마이그레이션·편집이 공유하는 단일 진실 원천이라 SessionStart 훅이 자체 매핑을 두면 세 경로가 어긋난다.

## Last Updated

2026-07-30 — Zod-free 커널·레거시 매핑 계약과 훅 직접 import 면책을 문서화했다.
