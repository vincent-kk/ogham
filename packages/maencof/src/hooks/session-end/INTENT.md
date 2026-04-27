# session-end

## Purpose

세션 종료 훅. 일일 노트 종료 기록 및 session-scope 캐시 정리.

## Boundaries

### Always do

- dailynote-writer로 종료 항목 추가
- cache-manager로 세션 파일 삭제 (`removeSessionFiles`)
- cache-manager.removeTurnContext로 turn-context 캐시 삭제 (turn-context는 session-scope)
- 세션 종료 시 수렴 요건·합의 전제·잠정 원리·미해결 긴장을 요약한 recap 메시지 빌드 (session_recap.enabled=true 일 때)

### Ask first

- 종료 기록 포맷 변경

### Never do

- 볼트 데이터 삭제
- vault-scope 캐시 삭제 (graph/weights/snapshot/stale-nodes 등은 MCP server 영역)
