# vaultRedirector

## Purpose

볼트 경로 리디렉션. .maencof 디렉토리 접근 차단 및 경로 보정.

## Conventions

리디렉션 우회 경로를 만들지 않는다 — `.maencof` 내부는 MCP 도구가 소유하고 직접 편집은 캐시·상태를 깨뜨린다.

## Boundaries

### Always do

- MAENCOF_DIR/META_DIR 경로 기반 판단
- isMaencofVault 선행 검증

### Ask first

- 차단 경로 패턴 변경

### Never do

- 리디렉션 우회
