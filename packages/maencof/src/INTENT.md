# src

## Purpose

maencof 플러그인 소스 루트. 5-Layer Knowledge Model v2 기반 개인 지식 공간 관리자.

## Structure

- `core/` — 순수 비즈니스 로직 모듈 (I/O 예외: vault-scanner, insight-stats, transition-history, error-log, autonomy)
- `hooks/` — Claude Code 훅 진입점 (esbuild 번들 대상)
- `mcp/` — MCP 도구 핸들러
- `types/` — 중앙 타입 정의
- `constants/` — 공유 상수

## Boundaries

### Always do

- types/ 중앙 타입을 import하여 사용
- core/ 모듈은 순수 함수로 유지 (I/O 예외: vault-scanner, insight-stats, transition-history, error-log, autonomy)
- index.ts barrel export를 통해 외부 공개
- hooks/ 추가 시 config-registry.ts에 등록하고 bridge/ 스크립트 빌드 확인

### Ask first

- 새 core/ 모듈 추가 시 index.ts export 갱신 필요 여부
- MCP 도구 추가 시 server.ts 등록 + Zod 스키마 + types/mcp.ts 타입 정의
- 아키텍처 버전(EXPECTED_ARCHITECTURE_VERSION) 변경 시 마이그레이션 로직 필요 여부

### Never do

- hooks/ 진입점 파일을 직접 import하지 않음 (esbuild 진입점)
- core/ 모듈에서 mcp/ 또는 hooks/ 직접 의존
- version.ts 직접 수정 (inject-version.mjs 사용)
- bridge/ 출력 파일 직접 수정 (esbuild 생성 결과물)
