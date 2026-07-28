# infra contract

## Requirements

- config, cache와 content-addressed ephemeral artifact의 host I/O를 소유한다.
- core의 나머지 계층은 파일시스템을 직접 만지지 않고 이 계층을 통과한다.
- config는 v2 strict schema이며 v1은 읽을 때 메모리에서만 변환되고 자동으로 기록되지 않는다.
- artifact는 임시 자료다. 장기 원장으로 취급하지 않는다.

## API Contracts

- `loadConfig`, `writeConfig`, `initProject`, `migrateConfigV1`, `validateConfigPatch` — config 수명주기.
- `getRuleDocsStatus`, `syncRuleDocs`, `loadRuleDocsManifest` — 관리형 규칙 문서 배포.
- `getCacheDir`, `removeSessionFiles`, prune 게이트 — 세션 캐시.
- artifact store — 16 KiB 초과 payload의 atomic write와 경로·해시 반환.

## Acceptance Criteria

### AC-infra-config-v2 — strict schema

- 알 수 없는 key는 무시되지 않고 거부된다.
- v1 config는 진단과 함께 메모리에서 변환되며 사용자가 승인할 때만 기록된다.

### AC-infra-artifact — 임시 저장

- 예산 초과 payload가 atomic write되고 경로·바이트·SHA-256이 반환된다.

## Last Updated

2026-07-28 — 중간 계층 fractal 계약을 문서화했다.
