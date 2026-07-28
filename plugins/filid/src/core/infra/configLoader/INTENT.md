# configLoader — config v2 and managed rule documents

## Purpose

adapter-aware config v2의 검증·비파괴 migration·승인 저장과 managed rule document 동기화를 소유한다. config는 user(호스트 상태 루트)와 project(`<gitRoot>/.filid/config.json`) 두 레이어이며 project가 user를 재정의한다.

## Structure

- `loaders/` organ — v2 schema/types, v1 migration, load/write/init와 rule-doc facade
- `utils/` organ — project/plugin root, strict sanitize와 hash helpers
- `index.ts` — enumerated public boundary, 이 fractal의 유일한 공개 표면

## Boundaries

### Always do

- load는 source config를 쓰지 않고 migration diagnostics를 반환
- v1 migration은 **병합 전에 레이어별로** 적용한다 — v1→v2는 shape 변경이라 두 shape를 먼저 합치면 어느 스키마도 설명하지 못하는 문서가 나온다
- 검증은 병합 결과에만 건다. project 레이어는 재정의한 키만 담을 수 있고 단독으로는 strict 스키마를 통과하지 못한다
- write는 validated v2 config를 호출자가 지정한 한 레이어에만 저장
- managed target은 shared rule manager에 위임하며 레이어 선택이 배포 채널을 정한다
- 레이어를 지정한 sync는 새 레이어에 먼저 쓰고 그 다음 반대편 소유 문서를 회수

### Ask first

- v2 schema, migration discard policy, 레이어 개수·우선순위 또는 managed owner 주소 변경

### Never do

- load 중 자동 migration write
- 병합 결과를 어느 한 레이어에 되쓰기 — project 재정의가 user 기본값에 구워진다
- programming-language 의미를 config core에서 해석
- 레이어를 지정하지 않은 sync가 반대편 레이어를 건드리기 — headless 호출이 전역 규칙을 지운다
- loaders/ 또는 utils/에 INTENT.md 추가

## Dependencies

- Zod, adapter registry IDs, agent-artifacts와 host path utilities
