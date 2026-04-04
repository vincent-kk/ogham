# changelog-gate

## Purpose

마이그레이션 중 변경 차단 게이트. migration.lock 기반 TTL 검사.

## Boundaries

### Always do

- isMaencofVault 검증 선행
- 감시 경로 변경 여부 확인

### Ask first

- 차단 조건 변경

### Never do

- lock 파일 직접 조작
