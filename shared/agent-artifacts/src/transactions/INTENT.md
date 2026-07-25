## Purpose

읽기 전용 계획이 기록한 대상 리비전을 잠금 아래 재검증하고, 물리 파일 단위의
원자적 적용 결과를 제공한다.

## Structure

| Path              | Role                                 |
| ----------------- | ------------------------------------ |
| `index.ts`        | plan·revision·apply result 공개 배럴 |
| `transactions.ts` | transaction facade(후속 작업)        |
| `planning/`       | 대상 내용에서 revision 생성          |
| `apply/`          | lock·stale 검사·원자적 파일 교체     |
| `types/`          | facade 순환을 막는 transaction 계약  |

## Conventions

- 리비전은 설정 페이지로 직렬화할 수 있는 불변 값이다.
- 원자성 단위는 하나의 물리 파일이며 다중 파일은 정확한 부분 결과를 낸다.
- 구현은 `transactions.ts` facade를 역참조하지 않고 `types/`를 사용한다.

## Boundaries

### Always do

- 쓰기 전 lock 획득과 revision 재검증을 모두 수행한다.
- stale revision 또는 lock timeout을 conflict로 반환한다.

### Ask first

- revision 형식, lock timeout 기본값, 원자성 단위 변경.

### Never do

- lock 획득 실패 후 잠금 없이 진행하거나 stale plan을 재계획 없이 적용.
- 파일 시스템 primitive를 재구현.

## Dependencies

- `@ogham/cross-platform/filesystem`.
