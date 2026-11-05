# tools

## Purpose

MCP 도구 핸들러의 공개 경계. 지식 문서 CRUD, 그래프 연산, CLAUDE.md 관리, companion identity 편집, 작업 이력 조회, updated 기준 최근 문서 열거.

## Conventions

도구별 계약과 렌더링 규칙은 해당 자식 fractal이 소유한다. 상위 문서가 도구 이름·입출력 목록을 복제하지 않는다.

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
