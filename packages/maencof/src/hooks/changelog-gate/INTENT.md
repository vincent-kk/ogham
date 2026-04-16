# maencof-changelog-gate

## Purpose

Stop 훅. 감시 경로에 미커밋 변경이 있으면 세션 종료를 차단하고 changelog 기록을 유도. migration.lock orphan cleanup 포함.

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
