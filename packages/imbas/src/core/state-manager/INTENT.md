# state-manager

## Purpose
state.json CRUD 및 파이프라인 상태 전이 규칙 검증.

## Boundaries
### Always do
- 파일 I/O는 lib/file-io.ts 경유
- 상태 전이는 정의된 규칙 준수
### Ask first
- 전이 규칙 변경
### Never do
- 직접 fs.writeFileSync 호출
