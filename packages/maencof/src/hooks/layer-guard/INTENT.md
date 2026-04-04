# layer-guard

## Purpose

PreToolUse 훅. Layer 1 (Core) 문서 쓰기 방지.

## Boundaries

### Always do

- isLayer1Path로 경로 검증
- isMaencofVault 선행 검증

### Ask first

- 보호 레이어 범위 변경

### Never do

- 보호 우회 로직 추가
