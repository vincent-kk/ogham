# server -- MCP 서버 초기화 및 18개 도구 등록

## Purpose

MCP 서버 초기화 및 18개 도구 등록.

## Boundaries

### Always do
- 변경 후 관련 테스트 업데이트
- 모든 도구 응답은 `toolResult`를 통해 compact JSON으로 직렬화

### Ask first
- 공개 API 시그니처 변경

### Never do
- 모듈 경계 외부 로직 인라인
- 응답 직렬화에 indent 강제 (디버그는 `FILID_PRETTY_JSON=1` env 사용)
