# debtManage — Removal Contract

## Requirements

- Filid 1.0은 technical debt lifecycle을 FCA core 또는 MCP 기능으로 소유하지 않는다.
- `debt_manage`는 1.0 server registry, public exports, generated adapter와 사용자 스킬에서 제거한다.
- 기존 프로젝트의 `.filid/debt/` 파일은 자동 삭제하거나 변환하지 않는다.
- debt 판단이나 mutation이 필요하면 Filid 밖의 명시적 workflow가 소유한다.

## API Contracts

- Filid 1.0 공개 API 계약은 없다.
- 제거 과정은 기존 debt 파일을 읽거나 쓰지 않는다.

## Acceptance Criteria

### AC-debt-removal — 공개 표면 제거

- MCP tool list와 generated plugin에서 `debt_manage`가 발견되지 않는다.
- build와 runtime이 debt type, constants 또는 handler를 import하지 않는다.

### AC-debt-preservation — 사용자 자료 보존

- 설치·migration·scan은 기존 `.filid/debt/` 내용을 변경하지 않는다.

## Last Updated

2026-07-26 — debt workflow를 Filid 1.0 비목표로 명시했다.
