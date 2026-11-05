# jira — Contract

## Requirements

- 이 계층은 `mcp/` 를 참조하지 않는다. 프로필 영속화에는 Node 파일 I/O와 cross-platform lock을 사용할 수 있고, 저장 형식과 원자성은 자식 contract가 고정한다.
- 자식 레시피는 `src/jira/index.ts` 가 이름으로 재노출한다 — 와일드카드 재노출 없음.

## API Contracts

호출 형태와 구체적인 반환 값은 공개 진입점과 테스트에서 확인한다.

## Acceptance Criteria

### AC-jira-layer-direction — 단방향 의존

- `src/jira/**` 에서 `mcp/` 를 참조하는 import 가 0건이다.

### AC-jira-named-exports — 이름 있는 재노출

- `src/jira/index.ts` 에 `export *` 가 없다.

## Last Updated

Jira 레시피의 허용 I/O와 공개 경계가 바뀔 때 갱신한다.
