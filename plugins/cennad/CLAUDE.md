# CLAUDE.md — @ogham/cennad

현재 계약은 [INTENT.md](./INTENT.md), 소스 경계는 [src/INTENT.md](./src/INTENT.md)를 따른다. provider 동작은 [provider-dispatch.md](../../.metadata/cennad/provider-dispatch.md), 자동 주입은 [hooks.md](../../.metadata/cennad/hooks.md), 저장 계약은 [storage.md](../../.metadata/cennad/storage.md)가 정본이다.

## Responsibility split

- dispatch skill은 입력 파싱·background spawn·결과 relay만 맡는다. `courier`가 provider 대화, 최대 3회의 refine, 실패 remedy, tier 판단을 소유한다.
- courier를 spawn할 때 Agent 도구의 `name`을 넘기지 않는다. 이름을 주면 에이전트가 mailbox 대기 모드로 떠 프롬프트를 실행하지 않고, 스킬이 `SendMessage`를 보내지 않아 위임이 무산된다.
- hook은 read-only context injection만 수행한다. 자동 지목 대상은 `enabled`가 아니라 self host와 `crosscheck_only`를 제외한 `electable` 집합이다.

## Hook invariants

- 훅 번들은 10 KB LIGHT 상한 안에서 Node 내장 모듈만 사용한다. `src/core/`·`src/types/`와 무거운 의존성을 가져오지 않는다.
- self host 판정은 훅 전용 `resolveHostDescriptor`를 사용한다. MCP용 `detectHost()`를 훅에서 호출하면 호스트를 잘못 판정한다.
- 금지 모듈 가드는 번들 문자열도 검사하므로 주입 문구의 일반 단어가 가드 패턴과 충돌할 수 있다.

## Provider invariants

- tier를 생략한 새 대화는 provider 기본 tier, 이어지는 대화는 저장된 세션 tier를 쓴다. 명시한 tier만 해당 호출을 override하며 model과 effort는 한 쌍으로 해석한다.
- timeout은 두 층이다. cennad 층은 무출력 idle 한도와 tier별 절대 hard cap의 조합이며, provider 출력을 streaming으로 유지해 진행 중인 호출이 idle로 종료되지 않게 한다. 호스트 층은 MCP 호출 자체의 idle 한도(stdio 기본 30분)로 cennad의 hard cap보다 짧다 — `wrapHandler`의 progress 하트비트와 `.mcp.json`의 per-server `timeout` 하한이 이를 막는다.
- Antigravity의 `skip_permissions`와 `sandbox` 기본값은 한 쌍이다. 전자는 headless 도구 실행을 허용하고 후자는 그 자동 승인을 터미널 제약 안에 가둔다.
- Antigravity 재개는 가능한 경우 conversation id를 사용한다. id가 없을 때만 격리 cwd를 사용하며, 빈 stdout 복구는 완결된 최종 응답만 인정한다.
