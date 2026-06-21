# activityLog

## Purpose

활동 이벤트 로그. 일자별 NDJSON(`dailynotes/activity/YYYY-MM-DD.jsonl`)에 한 줄 1이벤트로
append 한다. 레거시 `dailynotes/*.md` 를 대체하는 견고한 데이터 계층.

## Structure

- `activityLog.ts` — 경로 헬퍼, append, 라인 단위 read

## Conventions

- 한 줄 = DailynoteEntry JSON (time/category/description/path?)
- append-only — 기존 라인 수정/덮어쓰기 금지
- 손상된 라인은 건너뛰고 나머지는 보존(NDJSON 복원력)

## Boundaries

### Always do

- DailynoteEntry 타입 준수
- 파싱 실패 라인은 skip, 빈 배열/부분 결과로 graceful degrade

### Ask first

- 파일 포맷·경로 변경

### Never do

- 레거시 `dailynotes/*.md` 에 쓰기 (읽기 전용 폴백은 dailynoteWriter 담당)
- 세션 라이프사이클 기록 (sessionStore 영역)
