# sessionEnd

## Purpose

세션 종료 훅. 세션 레코드 마감(sessionStore JSON) 및 session-scope 캐시 정리.

## Boundaries

### Always do

- sessionStore로 세션 종료 마감 (`recordSessionEnd`, session_id 키, 볼트작업 차분 산출)
- workIndex로 당일 작업 digest 재생성 (`buildDailyDigest`, 마감된 일자 대상)
- cacheManager로 세션 파일 삭제 (`removeSessionFiles`)
- cacheManager.removeTurnContext로 turnContext 캐시 삭제 (turnContext는 session-scope)

### Ask first

- 종료 기록 포맷 변경

### Never do

- recap 등 표시용 출력 emit (SessionEnd 는 표시 보장 채널 없음 — recap 은 `stop/helpers/sessionRecap` 소관)
- 볼트 데이터 삭제
- vault-scope 캐시 삭제 (graph/weights/snapshot/stale-nodes 등은 MCP server 영역)
- `.maencof-meta/sessions/*.md` 에 쓰기
- 세션 라이프사이클을 dailynote .md 에 기록 (sessionStore 전용)
