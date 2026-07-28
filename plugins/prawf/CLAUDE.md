# CLAUDE.md — @ogham/prawf

현재 계약은 [INTENT.md](./INTENT.md), skill·persona API는 [DETAIL.md](./DETAIL.md)를 따른다. 한국어 설계 정본은 [`.metadata/prawf/`](../../.metadata/prawf/)이며 구현 문서는 영어로 유지한다.

## Authoring contract

- 외부 조사 기능은 특정 도구명이 아니라 capability로 위임한다.
- persona id, axis id, 상태 enum, 산출물 파일명은 agent·orchestration·prompt·template·모든 skill에서 동일해야 한다.
- 비상호작용 skill은 Tier-2a로 끝까지 이어간다. `simulate-defense`만 명시된 `<!-- [INTERACTIVE] -->` 지점에서 답변을 기다리는 Tier-2b이며 `--batch`에서는 Tier-2a가 된다.
- `.metadata/prawf/`는 설계 참조이고 `agents/`·`skills/`는 배포 구현이다. 구현 중 설계 기록을 산출물처럼 갱신하지 않는다.
