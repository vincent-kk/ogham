# sessionStore

## Purpose

세션 기록 저장소. 일자별 세션 JSON 파일에 세션을 session_id 키 맵으로 보관하고 볼트 작업 차분을 산출한다.

## Conventions

- 하루 1파일, `sessions[sessionId]` 직접 조회 (전수조사 금지; sweep 도 최근 일자 창 고정)
- SessionStart 에서 baseline 스냅샷 → 매 턴 touch 가 lastActivityAt/usageSnapshot 갱신 → sweep(boot/shutdown)이 `snapshot - baseline` 차분으로 마감
- sweep 마감은 잠정적 (baseline/snapshot 보존) — touch 가 오마감을 재개방하고 sweep 이 멱등 재차분
- usage-stats 는 숫자 카운트만 사용 (legacy 비숫자 키 무시)

## Boundaries

### Always do

- SessionDayLog / SessionRecord 타입 준수
- 손상된 일자 파일은 빈 로그로 폴백 (복구 가능한 데이터 덮어쓰기 금지)
- 자정 교차 세션은 직전 일자 미마감 레코드를 찾아 마감

### Ask first

- 일자 파일 포맷·경로 변경

### Never do

- `.maencof-meta/sessions/*.md` 읽기/쓰기
- 누적(cumulative) 통계를 per-session 데이터로 기록
