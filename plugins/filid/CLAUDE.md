# CLAUDE.md — @ogham/filid

현재 계약은 [INTENT.md](./INTENT.md), 소스 경계는 [src/INTENT.md](./src/INTENT.md)를 따른다. 설계·규칙·공개 API의 정본은 [`.metadata/filid/README.md`](../../.metadata/filid/README.md)에서 찾는다.

## Anti-yield contract

- 다단계 skill은 파일 상단에서 실행 모델을 선언하고, MCP·subagent 반환 뒤 같은 turn에서 다음 단계로 이어간다.
- pipeline은 Tier-1, 비상호작용 다단계는 Tier-2a, 사용자 입력 지점이 있는 흐름은 Tier-2b로 다룬다. Tier-2b는 사용자 입력이 필요한 정확한 지점만 예외로 선언하고, Markdown 대화 중단점은 `<!-- [INTERACTIVE] -->`로 표시한다.
- 단일 단계처럼 yield 위험이 없는 Tier-3 skill에는 anti-yield 문구를 넣지 않는다.
- 새 skill은 상호작용 형태가 같은 기존 skill의 preamble과 단계 전환 callout을 기준으로 작성한다.

## Hook boundary

- 공유 패키지는 훅에서도 패키지 루트만 import하고 `sideEffects: false` 기반 tree-shaking을 번들 가드로 확인한다. Filid 내부 concrete import는 각 프랙털 경계를 따르며 공유 패키지 subpath 예외로 취급하지 않는다.
