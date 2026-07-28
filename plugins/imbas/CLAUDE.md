# CLAUDE.md — @ogham/imbas

현재 계약은 [INTENT.md](./INTENT.md), 소스 경계는 [src/INTENT.md](./src/INTENT.md), provider별 계약은 [`.metadata/imbas/specs/`](../../.metadata/imbas/specs/)를 따른다.

## Pipeline continuity

- 다단계 skill은 상단 `EXECUTION MODEL`에서 연속 실행을 선언하고 MCP·subagent·provider 작업의 반환 뒤 같은 turn에서 다음 단계로 이어간다.
- `manifest-stories` 완료에서 `devplan` 시작으로 넘어가는 경계는 별도 inline callout을 유지한다. 중간 산출물 요약으로 turn을 끝내지 않는다.
- skill이 provider 하나를 실행할 때 다른 provider의 `references/`를 읽지 않는다. 공통 계약만 provider 중립 경로에 둔다.
