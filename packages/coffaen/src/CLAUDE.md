# src

coffaen 플러그인 소스 루트. 4-Layer Knowledge Model 기반 개인 지식 공간 관리자.

## Boundaries

### Always do
- types/ 중앙 타입을 import하여 사용
- core/ 모듈은 순수 함수로 유지 (VaultScanner I/O 예외)
- index.ts barrel export를 통해 외부 공개

### Ask first
- 새 core/ 모듈 추가 시 index.ts export 갱신 필요 여부
- MCP 도구 추가 시 server.ts 등록 + Zod 스키마 정의

### Never do
- hooks/entries/ 파일을 직접 import하지 않음 (esbuild 진입점)
- core/ 모듈에서 mcp/ 또는 hooks/ 직접 의존
- version.ts 직접 수정 (inject-version.mjs 사용)
