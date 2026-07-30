# projectHash — Contract

## Requirements

- 프로젝트 스코프 식별자는 cwd 의 sha256 앞 12 hex 다. 같은 경로는 항상 같은 해시를 낸다.
- 이 해시가 세션 격리의 유일한 기준이다 — 다른 프로젝트의 세션이 서로 보이지 않는 이유가 여기서 나온다.
- 입력 cwd 는 호출자가 준 문자열 그대로 해시한다(정규화 없음). 정규화는 호출 측 책임이다.
- cwd 원문은 디스크·로그에 남기지 않는다 — 해시만 저장한다.

## API Contracts

- `getProjectHash(cwd: string): string` — cwd 를 12자리 hex 스코프 해시로 바꾼다.

세션 토큰(`generateToken`/`verifyToken`)은 이 모듈이 아니라 공유 패키지 `@ogham/http-kit` 이 소유한다.

## Acceptance Criteria

### AC-project-hash-determinism — 결정성

- 같은 경로는 언제나 같은 해시를 낸다.
- 서로 다른 경로는 서로 다른 해시를 낸다.

## Last Updated

2026-07-30 — 스코프 해시 계약을 문서화했다.
