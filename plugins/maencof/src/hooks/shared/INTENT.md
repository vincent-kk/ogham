# shared

## Purpose

훅 공통 유틸리티. 호스트별 project target 경로, vault 검증, stdin/stdout 처리.

## Boundaries

### Always do

- 모든 훅에서 공유하는 상수/함수 제공
- MAENCOF_DIR/META_DIR 경로 상수
- 지침 경로는 runtime host, 목적별 project instruction target,
  `instructions/hook/status`로 해석

### Ask first

- 공유 함수 시그니처 변경

### Never do

- 훅 특화 로직 추가

## Dependencies

- `@ogham/agent-artifacts/instructions/hook/status`,
  `@ogham/agent-artifacts/targets/project/instructions`,
  `@ogham/cross-platform/host-registry/descriptor`.
