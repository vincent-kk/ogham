## Purpose

MCP 도구 4종의 독립 경계를 소유한다. 실행 도구는 안전 실행과 통계 정책을 분리하고 구조화 결과로 setup과 runtime의 관리형 library를 연결한다.

## Conventions

- 도구 등록명 snake_case, 심볼·파일 camelCase
- 핸들러는 평문 데이터 반환 (wrapHandler 가 JSON 직렬화)
- 1함수1파일 operations, 도구 간 직접 import 금지 (core·shared 경유)
- 구조화 결과의 경로는 constants에서 확정된 runtime 값만 사용

## Boundaries

### Always do

- 새 도구는 독립 프랙탈 + `index.ts` 배럴 + INTENT.md

### Ask first

- 도구 추가/이름 변경 (createServer·.mcp.json 영향)

### Never do

- 도구 핸들러에서 다른 도구 핸들러 직접 호출
- 통계 정책을 run_r 에, 실행을 assert 에 누설
