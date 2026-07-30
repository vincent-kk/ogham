# projectHash — Contract

## Requirements

- cwd 의 결정적 해시 `sha256(cwd).slice(0, 12)` 를 계산한다. 같은 경로는 언제나 같은 값을 낸다.
- 이 값이 세션 격리의 폴더 이름이 된다 — 다른 프로젝트의 세션을 참조하거나 오염시키지 않는 근거가 여기서 나온다.

## API Contracts

- `getProjectHash(cwd: string): string` — 12자리 hex 스코프 해시.

## Acceptance Criteria

### AC-hash-determinism — 결정성

- 같은 경로는 항상 같은 해시를 낸다.
- 다른 경로는 다른 해시를 낸다.

## Last Updated

2026-07-30 — 프로젝트 스코프 해시 계약을 문서화했다.
