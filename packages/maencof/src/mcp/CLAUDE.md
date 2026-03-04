# mcp

MCP 서버 + 17개 도구 핸들러. stdio 전송으로 Claude Code와 통신.

## Always do

- 도구 입력은 Zod 스키마로 검증
- server.ts에 도구 등록 후 핸들러를 tools/에 구현
- shared.ts의 toolResult/toolError 헬퍼 사용
- 쓰기 도구(create/update/delete/move/capture_insight/boundary_create/kg_build) 성공 시 invalidateCache() 호출

## Ask first

- 새 도구 추가 시 types/mcp.ts 입출력 타입 정의 필요 여부
- 그래프 캐시 무효화 전략 또는 ensureFreshGraph 로직 변경
- BLOCKED_PREFIXES 목록 변경 (보안 영향)

## Never do

- 도구 핸들러에서 파일 I/O 직접 수행 (core/ 모듈 위임)
- server-entry.ts 수정 (esbuild 번들 진입점)
- getVaultPath() 우회 또는 vault 경로 하드코딩
