## Purpose

Pure local format conversion: ADF/Storage Format <-> Markdown. Zero dependency on auth/config/HTTP.

## Conventions

- 변환 방향마다 독립 구현을 유지한다 — 한 방향의 포맷 규칙이 다른 방향에 섞이지 않게 한다.
- 순수 함수만 허용 — 부수 효과 없음
- Python ADF 레퍼런스 구현을 기준으로 포팅

## Dependencies

- 외부 라이브러리 없이 Node 내장 모듈만 허용한다 — 순수 로컬 호환 계층을 유지한다.

## Boundaries

### Always do

- Support all 17 ADF node types from the Python reference
- Preserve round-trip fidelity for common constructs

### Ask first

- Add new format support

### Never do

- Import from core/ or mcp/ (converter is a pure sibling module)
- Make HTTP calls or use auth
