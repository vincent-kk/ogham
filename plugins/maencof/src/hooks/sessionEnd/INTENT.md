# sessionEnd

## Purpose

세션 종료 훅. 세션 레코드 마감(sessionStore JSON) 및 session-scope 캐시 정리.

## Boundaries

### Always do

- sessionStore로 세션 종료 마감 (`recordSessionEnd`, session_id 키, 볼트작업 차분 산출)
- workIndex로 당일 작업 롤업 재생성 (`buildDailyRollup`, 마감된 일자 대상)
- cacheManager로 세션 파일 삭제 (`removeSessionFiles`)
- cacheManager.removeTurnContext로 turnContext 캐시 삭제 (turnContext는 session-scope)
- 세션 종료 시 수렴 요건·합의 전제·잠정 원리·미해결 긴장을 요약한 recap 메시지 빌드 (session_recap.enabled=true 일 때)

### Ask first

- 종료 기록 포맷 변경

### Never do

- 볼트 데이터 삭제
- vault-scope 캐시 삭제 (graph/weights/snapshot/stale-nodes 등은 MCP server 영역)
- 구 `.maencof-meta/sessions/*.md` 에 쓰기 (자연 폐기)
- 세션 라이프사이클을 dailynote .md 에 기록 (sessionStore 전용)
