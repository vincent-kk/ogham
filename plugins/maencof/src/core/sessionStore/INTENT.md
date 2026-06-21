# sessionStore

## Purpose

세션 기록 저장소. 일자별 JSON(`activity/sessions/YYYY-MM-DD.json`)에 세션을
session_id 키 맵으로 보관하고 볼트 작업 차분을 산출한다.

## Structure

- `sessionStore.ts` — 경로 헬퍼, 시작/종료 기록, 직전 세션 요약, baseline 차분

## Conventions

- 하루 1파일, `sessions[sessionId]` 직접 조회 (전수조사 금지)
- SessionStart 에서 baseline 스냅샷, SessionEnd 에서 차분 후 baseline 제거
- usage-stats 는 숫자 카운트만 사용 (legacy 비숫자 키 무시)

## Boundaries

### Always do

- SessionDayLog / SessionRecord 타입 준수
- 손상된 일자 파일은 빈 로그로 폴백 (복구 가능한 데이터 덮어쓰기 금지)
- 자정 교차 세션은 직전 일자 미마감 레코드를 찾아 마감

### Ask first

- 일자 파일 포맷·경로 변경

### Never do

- 구 `.maencof-meta/sessions/*.md` 읽기/쓰기 (자연 폐기)
- 누적(cumulative) 통계를 per-session 데이터로 기록
