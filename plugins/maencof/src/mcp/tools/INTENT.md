# tools

## Purpose

18개 MCP 도구 핸들러. 지식 문서 CRUD, 그래프 연산, CLAUDE.md 관리.

## Boundaries

### Always do

- Zod 스키마로 입력 검증
- toolResult/toolError 헬퍼 사용
- 쓰기 도구 성공 시 캐시 무효화

### Ask first

- 새 도구 추가 시 server.ts 등록 필요
- 입출력 타입은 types/mcp.ts에 정의

### Never do

- 도구 핸들러에서 직접 파일 I/O (core/ 위임)
