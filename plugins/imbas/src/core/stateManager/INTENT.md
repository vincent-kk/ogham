# stateManager

## Purpose

state.json CRUD 및 파이프라인 상태 전이 규칙 검증.

## Conventions

skip도 전진 전이이므로 refine 통과 게이트를 우회하지 않는다. 실패한 전이를 되돌릴 수 있도록 입력 상태를 보존한다.

## Boundaries

### Always do

- 파일 I/O는 lib/fileIo.ts 경유
- 상태 전이는 정의된 규칙 준수

### Ask first

- 전이 규칙 변경

### Never do

- 직접 fs.writeFileSync 호출
