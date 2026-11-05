# vaultRedirector

## Purpose

볼트 문서를 읽는 도구에 MCP 대안을 안내하는 비차단 관심사.

## Conventions

내부 캐시·메타데이터는 지식 문서가 아니므로 문서 도구로 안내하지 않는다. 이 관심사는 읽기 안내만 소유하며 쓰기 권한을 집행하지 않는다.

## Boundaries

### Always do

- MAENCOF_DIR/META_DIR 경로 기반 판단
- isMaencofVault 선행 검증

### Ask first

- 안내 대상 경로 또는 비차단 정책 변경

### Never do

- 안내 실패를 도구 실행 차단으로 바꾸거나 내부 상태를 지식 문서로 안내
