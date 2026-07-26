# configLoader — config v2 and managed rule documents

## Purpose

adapter-aware `.filid/config.json` v2의 검증·비파괴 migration·승인 저장과 managed rule document 동기화를 소유한다.

## Structure

- `loaders/` organ — v2 schema/types, v1 migration, load/write/init와 rule-doc facade
- `utils/` organ — project/plugin root, strict sanitize와 hash helpers
- `configLoader.ts` / `index.ts` — enumerated public boundary

## Boundaries

### Always do

- load는 source config를 쓰지 않고 migration diagnostics를 반환
- write는 validated v2 config만 project root에 저장
- managed target은 shared rule manager에 위임

### Ask first

- v2 schema, migration discard policy 또는 managed owner 주소 변경

### Never do

- load 중 자동 migration write
- programming-language 의미를 config core에서 해석
- loaders/ 또는 utils/에 INTENT.md 추가

## Dependencies

- Zod, adapter registry IDs, agent-artifacts와 host path utilities
