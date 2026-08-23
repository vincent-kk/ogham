# mcp — maencof 도구 서버 경계

## Purpose

MCP 서버와 도구 핸들러를 소유하며 stdio 전송으로 Claude Code와 통신한다.

## Conventions

- 서버 실행 진입점은 companion migration을 한 번 수행한 뒤 `startServer`에 위임한다.
- 도구 핸들러는 입력 검증 뒤 core operation에 위임하고 공통 result envelope를 반환한다.

## Boundaries

### Always do

- 도구 입력은 Zod 스키마로 검증
- 서버 등록과 도구 핸들러 구현을 분리
- `toolResult`와 `toolError` 헬퍼 사용
- 쓰기 도구(create/update/delete/move/capture_insight/kg_build) 성공 시 invalidateCache() 호출

### Ask first

- 새 도구 추가 시 입출력 타입 정의 필요 여부
- 그래프 캐시 무효화 전략 또는 `ensureFreshGraphNonBlocking` 로직 변경
- BLOCKED_PREFIXES 목록 변경 (보안 영향)

### Never do

- 도구 핸들러에서 파일 I/O 직접 수행 (core 경계에 위임)
- 서버 실행 진입점을 라이브러리 API로 재노출 (버전 참조를 거슬러 순환이 된다)
- esbuild 진입점에 서버 로직 추가 (`startServer` 전 `runCompanionMigration` 1회만 허용)
- getVaultPath() 우회 또는 vault 경로 하드코딩
