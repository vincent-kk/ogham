# vault-redirector

## Purpose

볼트 경로 리디렉션. .maencof 디렉토리 접근 차단 및 경로 보정.

## Boundaries

### Always do

- MAENCOF_DIR/META_DIR 경로 기반 판단
- isMaencofVault 선행 검증

### Ask first

- 차단 경로 패턴 변경

### Never do

- 리디렉션 우회
