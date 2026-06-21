# workIndex

## Purpose

작업 이력 파생 계층. per-session 레코드 + 활동 로그에서 daily rollup 을 멱등 생성하고,
기간 집계와 토픽/레이어 역색인을 제공한다.

## Structure

- `inferTopicsLayers.ts` — 경로 → 레이어/토픽 추론 (순수)
- `workIndex.ts` — rollup 생성, 기간 합산, 역색인 재파생/조회

## Conventions

- daily rollup 만 영구 파생물 — 주/월은 daily 합산, 역색인은 on-demand 재파생
- rollup 은 전체 재계산 → 덮어쓰기(멱등). 역색인 stale 판정은 coversThrough vs 최신 daily
- 레이어는 layerFromDir 재사용, 토픽은 파일명 stem

## Boundaries

### Always do

- DailyRollup / ReverseIndex 타입 준수
- 손상 파일은 null/빈값 폴백 후 재생성

### Ask first

- rollup 포맷·역색인 갱신 정책 변경

### Never do

- LLM 자동 서사 요약 기록
- 주/월 집계를 별도 파일로 박제 (daily 합산으로 대체)
- 누적 통계를 per-day 데이터로 기록
