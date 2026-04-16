# maencof-changelog-gate

## Purpose

마이그레이션 중 변경 차단 게이트. migration.lock 기반 TTL + session 매칭 검사, orphan lock 정리.

## Boundaries

### Always do

- isMaencofVault 검증 선행
- 감시 경로 변경 여부 확인
- migration.lock orphan cleanup: TTL 만료 또는 session 불일치 lock 은 unlink 후 정상 게이트 진행

### Ask first

- 차단 조건 변경
- cleanup 조건 완화

### Never do

- 유효한 (in-progress) lock 파일 수정 / 삭제
- 다른 도메인(WAL, stale-nodes 등)의 lock 파일 조작
