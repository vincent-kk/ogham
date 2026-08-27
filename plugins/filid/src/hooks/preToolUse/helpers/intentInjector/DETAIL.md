# intentInjector — Filid 1.0 Contract

## Requirements

- Read/Write/Edit/Delete 방문에서 소유 fractal의 INTENT.md 경로, 읽기 지시, 상위 chain 경로와 DETAIL 경로를 hook cwd 기준으로 전달한다. 문서 본문은 전달하지 않는다.
- 전달 상태는 `commitVisit`의 none/stale/fresh 판정과 turn TTL(기본 3턴, `injection.ctxTtlTurns`)을 따른다.
- Delete를 포함한 모든 방문은 owner delivery 상태와 방문 map을 갱신한다. 미전달 소유 fractal의 첫 mutation도 차단하지 않고 owner INTENT.md 경로와 읽기 지시를 additional context로 전달하며, 문구는 읽었다는 증명을 주장하지 않는다.
- INTENT.md를 대상으로 한 Read/Write/Edit/Delete는 그 모듈의 조용한 전달이다: delivery를 stamp하고 ctx·guide를 내지 않으며, 같은 턴에 이미 방문한 디렉터리에서도 fast path를 우회해 stamp한다. `[filid:map]`은 방문 집합이 바뀌면 그대로 방출한다. DETAIL.md 문서 위생·삭제 보호는 별도 validator가 실행한다.
- branch, spike 상태, criteria ledger 또는 agent 역할은 방문 판정 입력이 아니다.

## API Contracts

- `processVisit(input): HookOutput` — 단일 방문 입력을 전달/cache 결정으로 변환한다.
- `resolveDeliveryContext(...)` — owner, delivery key와 self-delivery를 계산한다.
- `[filid:ctx]` 블록은 `[filid:ctx] <cwd 기준 파일>` / `intent: <cwd 기준 owner>/INTENT.md` / `action: …`(`HOOK_CTX_READ_DIRECTIVE`) / `chain: …`(부모 INTENT가 있을 때) / `detail: …`(owner DETAIL이 있을 때) 줄로만 구성된다. cwd 밖의 경로는 절대경로로 쓴다.
- machine path 비교와 상대경로 표현은 `@ogham/cross-platform` portable API를 사용한다.

## Acceptance Criteria

### AC-visit-delivery — 전달 상태 보존

- none Read는 포인터 ctx를, fresh 재방문은 무출력을, stale 재방문은 soft 포인터 ctx를 반환한다. 기본 TTL에서 stamp 후 2턴은 fresh, 3턴째는 stale이다.
- 동일 turn의 동일 디렉터리 재방문은 map과 ctx를 중복 방출하지 않는다.
- Delete 방문도 `commitVisit`을 거쳐 owner 방문과 delivery 상태를 기록한다.

### AC-visit-pointer — 본문 없는 전달

- 어떤 ctx나 deny reason도 INTENT.md 본문이나 `---` 구분선을 포함하지 않으며, `intent:` 경로와 `action:` 읽기 지시를 항상 포함한다.
- 모노레포에서 서로 다른 package 아래 같은 상대 디렉터리는 서로 다른 cwd 기준 `intent:` 경로를 받는다.
- owner INTENT.md 자체에 대한 Read는 ctx·guide 없이 delivery를 stamp하고, 같은 모듈의 다음 턴 mutation은 조용히 진행한다.
- 같은 턴에 이미 방문한 디렉터리에 새 INTENT.md를 Write해도 delivery가 stamp되어 다음 턴의 첫 code mutation은 조용히 진행한다.

### AC-visit-mutation — branch-independent mutation delivery

- 모든 branch에서 미전달 Write/Edit/Delete 일반 mutation은 permission decision 없이 포인터 context를 전달하고 즉시 진행한다.
- 첫 mutation은 방문 map에 기록되며, 동일 재시도는 fresh delivery로 포인터를 중복 전달하지 않는다.
- INTENT.md self-delivery와 owner INTENT가 없는 mutation은 포인터를 내지 않으며 보호 문서 삭제 판단은 validator에 맡긴다.

## Boundary Exemptions

### `intentInjector.ts` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`, `**/__tests__/**`
- **Direct import**: `allowed`
- **Reason**: 훅 번들은 배럴을 import할 수 없다 — esbuild 가 배럴이 재노출하는 모듈 전체를 번들로 끌어오고, `scripts/buildHooks.mjs` 의 바이트 캡이 이를 빌드 실패로 막는다.

## History

- 2026-08-28 — 첫 mutation의 일회성 deny를 제거하고 일반 첫 방문처럼 포인터 context를 주입한 뒤 즉시 진행하도록 바꿨다. 포인터가 이미 읽기 지침을 전달하므로 재시도 강제의 마찰보다 에이전트 자율성과 도구 호출 연속성을 우선했다.
- 2026-08-23 — `[filid:ctx]`와 gate deny에서 INTENT.md 본문 inline을 제거하고 cwd 기준 경로 + 읽기 지시로 바꿨다. 넓은 작업 턴·stale 재전달·서브에이전트마다 본문이 누적돼 컨텍스트를 잠식했고 읽기 강제의 필요는 줄었으므로, 읽기를 에이전트의 선택으로 돌렸다. 같은 이유로 INTENT.md 대상 호출을 조용한 전달로 바꾸고(settled 디렉터리 포함) TTL 기본값을 5턴에서 3턴으로 줄였다.

## Last Updated

2026-08-28 — 미전달 mutation도 차단 없이 포인터 context를 주입하고 방문으로 기록하도록 계약을 완화했다.
