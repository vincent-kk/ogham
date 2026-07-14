# 정본 수정 지시서 — Codex 이식 시 MCP 경로 좌표 상실

> ## ✅ 실행 완료 (main `77825966` — "Route MCP server path resolution through a shared host-paths helper")
>
> `@ogham/cross-platform` 에 `hostPaths`(`detectHost`·`pluginRoot`·`projectRoot`)가 신설되고 A(7 지점)·B(31 지점)가 전부 반영됐다. imbas 의 인자 폭증은 **`projectRootMemo`**(첫 호출이 준 프로젝트 루트를 세션에 기억)로 해소됐다.
> 남은 4개 `process.cwd()` 지점은 **의도적 잔류** — 프로젝트 좌표가 아니라 ast-grep 모듈 해석·자기탐색 폴백이다(§5 참조).
>
> **후속 델타는 [stage4-rules-channel.md](./stage4-rules-channel.md)** — 규칙 문서의 호스트 채널(`AGENTS.md`). G8 을 이 작업 뒤에 닫아서 아래 본문에는 없다.
>
> 아래는 **당시 근거 기록**이며 재실행 대상이 아니다.

---

> **원 상태: 미착수 — 수정 방향 기록 (2026-07-15).** 실측(codex-cli 0.144.4) 결과를 근거와 함께 담은 **자립 문서**다. 사실 정본은 [host-capability-matrix.md §9](./host-capability-matrix.md), 게이트 맥락은 [migration-playbook.md](./migration-playbook.md) G7.

## 0. 한 줄 요약

Codex 에 설치된 ogham 플러그인은 **MCP 서버가 뜨고 도구도 노출되지만, 도구를 부르면 사용자 프로젝트가 아니라 플러그인 설치 폴더를 본다.** `process.cwd()` 를 "사용자 프로젝트"로 가정하는 코드가 **8 플러그인 / 31 지점**, `CLAUDE_PLUGIN_ROOT` 를 읽는 코드가 **6 플러그인 / 7 지점** 있고, Codex 는 둘 다 주지 않는다.

**현행 코드는 틀리지 않았다** — Claude 계약 하에서는 완벽히 옳다. Codex 가 다른 계약을 줄 뿐이고, 그 차이는 **런타임만 흡수할 수 있다**(어댑터 파일 생성으로는 불가능).

## 1. 왜 이렇게 되는가 — 강제된 인과 사슬

MCP 서버는 **서로 다른 두 경로**를 쓴다.

| 좌표                                 | 무엇에 쓰나                                 | Claude (실측 `ps eww`)              | Codex (실측)                                |
| ------------------------------------ | ------------------------------------------- | ----------------------------------- | ------------------------------------------- |
| **A. 플러그인 루트** (자기 파일)     | 번들 자산 · R 계약 스크립트 · 설정 HTML     | `CLAUDE_PLUGIN_ROOT` env            | ❌ env 없음 — 단 `process.cwd()` 가 곧 이것 |
| **B. 프로젝트 루트** (사용자 작업물) | 프로젝트 식별 · 파일 대상 연산 · allow-root | `process.cwd()` (= 사용자 프로젝트) | ❌ **알 방법이 전혀 없다**                  |

Claude 는 둘을 **분리 제공**한다. 실제로 Claude 가 띄운 deilen MCP 서버의 env 를 떠보면:

```
PWD=/Users/Vincent/Soulstream/tirnanog                       ← B (사용자 프로젝트)
CLAUDE_PLUGIN_ROOT=/Users/Vincent/Workspace/ogham/plugins/deilen   ← A (플러그인)
CLAUDE_PLUGIN_DATA=/Users/Vincent/.claude/plugins/data/deilen-ogham
```

Codex 는 **둘 다 안 준다.** 그리고 이건 선택이 아니라 **강제**다:

1. 어댑터(`.codex-plugin/plugin.json`)는 저장소에서 생성되는데 **설치 경로**(`~/.codex/plugins/cache/<마켓>/<플러그인>/<버전>`)는 생성 시점에 **알 수 없다** → MCP `args` 에 절대경로를 못 박는다.
2. 그래서 args 는 상대경로(`bridge/mcp-server.cjs`)일 수밖에 없다.
3. 상대 args 가 풀리려면 프로세스 cwd 가 **플러그인 루트**여야 한다 → 어댑터가 `"cwd": "."` 를 방출한다.
   (안 하면 Codex 는 **세션 cwd** 로 서버를 띄우고 node 가 module-not-found 로 즉사한다. `codex exec` 는 이 실패를 **조용히 삼켜서** 도구가 그냥 없는 것처럼 보인다 — 이게 실제로 MCP 보유 9개 플러그인 전체가 무음 사망하던 원인이었고, 이미 어댑터 쪽에서 수정됐다.)
4. cwd 를 A 가 차지했으므로 **B 를 담을 그릇이 없다.**

**B 를 되찾을 다른 채널도 전부 막혀 있다 (전부 실측):**

- **env** — Codex 가 MCP 프로세스에 주는 env 는 어댑터가 넣은 `OGHAM_HOST` **하나뿐**이다. 세션 경로 힌트가 없다.
- **MCP `roots` 프로토콜** — 최소 MCP 서버를 물려 프로토콜을 뜯어봤다: `codex-mcp-client 0.144.4` 는 `roots` capability 를 **선언하지 않고**, 역질의 `roots/list` 에 `{"roots": []}` 를 돌려준다.
- **cwd** — 위 3번에서 A 가 가져갔다.

⇒ **서버 안에서는 B 를 알 수 없다.** §3-B 설계(모델이 인자로 넘긴다)는 우아해서가 아니라 **유일해서** 선택된다.

**훅은 대상이 아니다 (실측 확인).** Codex 는 훅 프로세스에는 `CLAUDE_PLUGIN_ROOT`·`PLUGIN_ROOT`·`PLUGIN_DATA` 를 주입하고 **cwd 도 세션 기준으로 준다** — maencof-lens SessionStart 훅이 `<세션cwd>/.maencof-lens/config.json` 을 정확히 찾아 읽고 그 결과를 모델에 주입하는 것을 확인했다. 즉 **훅에는 두 좌표가 다 있다.** `src/hooks/**` 는 손대지 않는다. **MCP 서버 런타임만** 대상이다.

## 2. 수정 지점 (전수 · 이 체크아웃 기준 검증됨)

### A — `CLAUDE_PLUGIN_ROOT` 의존 (6 플러그인 / 7 지점)

env 가 없으니 각자의 폴백으로 떨어지는데, **폴백이 안전한 곳과 아닌 곳이 갈린다.**

| 파일:줄                                                             | Codex 에서 벌어지는 일                                                                                                                                                                                 |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🔴 `r-statistics/src/constants/paths.ts:43`                         | `~/.claude/plugins/r-statistics/shared/contract.R` 로 폴백 → **그 경로는 실재하지 않는다**(확인함) → `run_r` 이 실행 계약을 못 찾아 **파손**. 실제 파일은 설치 루트에 있고 그게 곧 `process.cwd()` 다. |
| 🟡 `filid/src/core/infra/configLoader/utils/resolvePluginRoot.ts:3` | `null` 반환 → `syncRuleDocs` 가 `skipped`. 에러가 아니라 **조용한 무동작** — 사용자는 규칙이 배포된 줄 안다. 무음이라 더 위험.                                                                         |
| 🟡 `filid/src/mcp/tools/ruleDocsSync/ruleDocsSync.ts:126`           | 위와 같은 경로.                                                                                                                                                                                        |
| 🟡 `atlassian/src/mcp/tools/setup/utils/loadSettingsHtml.ts:27`     | 설정 UI HTML 을 못 찾아 setup 도구 실패 가능.                                                                                                                                                          |
| 🟡 `cennad/src/mcp/tools/openSettings/utils/loadSettingsHtml.ts:28` | 동일.                                                                                                                                                                                                  |
| 🟢 `entrez/src/mcp/tools/setup/utils/loadSettingsHtml.ts:16`        | 모듈 위치 기반 walk-up 폴백 보유 → 저위험. 그래도 헬퍼로 통일해 폴백 의존을 없앤다.                                                                                                                    |
| 🟢 `deilen/src/mcp/httpServer/utils/bridgeRoot.ts:14`               | 동일하게 walk-up 폴백 보유 → 저위험.                                                                                                                                                                   |

### B — `process.cwd()` 를 프로젝트로 가정 (8 플러그인 / 31 지점)

여기는 폴백이 없다. **전부 조용히 플러그인 폴더를 본다.**

**`imbas` (15) — 🔴 사실상 전 기능.** 도구 대부분이 프로젝트 대상(매니페스트·플랜·전이·캐시)이라 프로젝트가 플러그인 폴더로 바뀌면 의미가 없다.

```
imbas/src/mcp/tools/manifestImplementPlan/manifestImplementPlan.ts:31
imbas/src/mcp/tools/runTransition/runTransition.ts:23
imbas/src/mcp/tools/runGet/runGet.ts:19
imbas/src/mcp/tools/configGet/configGet.ts:15
imbas/src/mcp/tools/manifestGet/manifestGet.ts:19
imbas/src/mcp/tools/manifestPlan/manifestPlan.ts:15
imbas/src/mcp/tools/runCreate/runCreate.ts:28
imbas/src/mcp/tools/runList/runList.ts:16
imbas/src/mcp/tools/cacheGet/cacheGet.ts:24
imbas/src/mcp/tools/manifestValidate/manifestValidate.ts:15
imbas/src/mcp/tools/configSet/configSet.ts:16
imbas/src/mcp/tools/manifestSave/manifestSave.ts:28
imbas/src/mcp/tools/cacheSet/cacheSet.ts:18
imbas/src/mcp/tools/astSearch/astSearch.ts:36        ← 이미 `input.path ?? process.cwd()` — B 수정의 선례
imbas/src/ast/astGrepShared/astGrepShared.ts:43      ← ⚠ 프로젝트가 아니라 @ast-grep/napi 모듈 해석용. 재분류 검토 (A 에 가깝다)
```

**`deilen` (5) — 🟡 프로젝트 격리 붕괴.** `getProjectHash(process.cwd())` 라 Codex 에서는 **모든 프로젝트가 한 버킷으로 붕괴**한다. 렌더 자체는 되지만 뷰어 세션·피드백이 프로젝트 간 섞인다.

```
deilen/src/mcp/tools/renderViewer/renderViewer.ts:54
deilen/src/mcp/tools/closeViewer/closeViewer.ts:21
deilen/src/mcp/tools/collectFeedback/collectFeedback.ts:43
deilen/src/mcp/httpServer/httpServer.ts:54
deilen/src/mcp/httpServer/utils/bridgeRoot.ts:33     ← A 폴백과 겹침 (cwd 가 플러그인 루트면 오히려 맞다)
```

**`filid` (4) — 🟡 엉뚱한 루트를 청소·추적 대상으로 삼는다.**

```
filid/src/mcp/server/registerShutdown.ts:13
filid/src/mcp/server/bootSweep.ts:17                 ← 이미 `cwd: string = process.cwd()` 인자 받음 — 선례
filid/src/mcp/server/cleanupOwnSessionCache.ts:13
filid/src/ast/astGrepShared/utils/getSgModule.ts:20  ← ⚠ imbas 와 동일하게 모듈 해석용. 재분류 검토
```

**`cennad` (2) — 🔴 위임이 깨진다.** projectHash 붕괴에 더해, **위임 프로세스를 플러그인 폴더에서 spawn** 하면 위임받은 codex/agy 가 사용자 코드를 못 본다.

```
cennad/src/mcp/tools/startConversation/startConversation.ts:53
cennad/src/mcp/tools/continueConversation/continueConversation.ts:30
```

**`maencof` (2) · `maencof-lens` (1) — 🟡 vault/config 루트가 어긋난다.** 단 `MAENCOF_VAULT_PATH` env 오버라이드가 이미 있다.

```
maencof/src/mcp/server/graphCache/graphCache.ts:27          (MAENCOF_VAULT_PATH ?? process.cwd())
maencof/src/mcp/tools/contextCacheManage/contextCacheManage.ts:37  (cwd ?? MAENCOF_VAULT_PATH ?? process.cwd())
maencof-lens/src/mcp/serverEntry/serverEntry.ts:11          (configRoot — .maencof-lens/config.json 위치)
```

**`atlassian` (1) · `r-statistics` (1) — 🔴 r-statistics 는 치명적.**

```
atlassian/src/utils/path.ts:9
r-statistics/src/constants/paths.ts:54   ← inputDataRoot = R 작업 allow-root.
                                            플러그인 루트가 되면 사용자 데이터가 allow-root 밖 →
                                            A(:43)를 고쳐도 run_r 은 여전히 쓸 수 없다.
                                            (R_STATISTICS_DATA_ROOT env 오버라이드는 이미 있음)
```

## 3. 설계

### 3.1 헬퍼의 집 — `@ogham/cross-platform` 에 `./host-paths` 추가

**왜 여기인가**: 이 공유 패키지를 **10개 중 8개 플러그인이 이미 의존**하고 `./paths`·`./env` 서브패스도 이미 있다. 새 공유 패키지를 만들면 의존 그래프에 노드·간선이 늘어 FCA DAG 관리 비용만 붙는다. 플러그인별로 복제하면 8벌이 표류한다.

```ts
export type Host = "claude" | "codex" | "agy";

/** 어댑터가 MCP 선언에 주입한 마커. 부재 = claude (Claude .mcp.json 은 무수정이라 마커가 없다). */
export function detectHost(): Host; // process.env.OGHAM_HOST ?? "claude"

/** A. 플러그인 루트. */
export function pluginRoot(): string | null;
//  claude → process.env.CLAUDE_PLUGIN_ROOT ?? null
//  codex  → process.cwd()   ← 어댑터가 cwd:"." 로 고정했기에 성립. 비자명한 결합이니 반드시 주석.
//  agy    → 미정 (아래 §5)

/** B. 프로젝트 루트. */
export function projectRoot(explicit?: string): string;
//  explicit(절대경로) 우선
//  claude → process.cwd()
//  codex  → explicit 없으면 throw
```

**왜 codex 에서 `projectRoot()` 가 폴백하지 않고 throw 하는가**: 폴백할 곳이 `process.cwd()` = 플러그인 루트뿐인데, **그게 바로 지금 고치려는 조용한 오동작이다.** 사용자 데이터를 플러그인 폴더에서 찾고, 남의 프로젝트 해시로 뷰어를 열고, 엉뚱한 곳을 청소한다. **명시적 실패가 조용한 오동작보다 낫다** — 이 원칙이 설계의 핵심이다.

**왜 codex 에서 `pluginRoot()` 가 `process.cwd()` 인가**: §1 의 3번 때문이다. 어댑터가 `cwd:"."` 를 방출하지 않으면 서버가 아예 안 뜬다. 즉 **서버가 살아 있다는 사실 자체가 cwd = 플러그인 루트를 보장**한다. 코드만 봐선 안 보이는 결합이므로 주석으로 남긴다.

### 3.2 A 적용 — 기계적, 저위험, 먼저 해도 된다

7 지점의 `process.env.CLAUDE_PLUGIN_ROOT` 를 `pluginRoot()` 로 교체한다. **모델 개입 없음, 스킬 변경 없음, Claude 동작 불변.** r-statistics `contract.R` 이 이걸로 살아난다.

### 3.3 B 적용 — 모델이 넘기는 수밖에 없다

**왜 모델인가**: §1 에서 서버 쪽 채널(env·roots·cwd)이 전부 막혔다. 반면 **모델은 세션 워크스페이스 경로를 안다**(Codex TUI 가 `directory: ~/Workspace/…` 를 표시하고 시스템 컨텍스트에 넣는다). 두 좌표를 다 아는 유일한 주체다.

- 프로젝트 대상 MCP 도구 스키마에 **선택 인자** `projectRoot?: string`(절대경로)를 추가.
- 런타임은 `projectRoot(args.projectRoot)` 로 해석.
- **왜 선택 인자인가**: Claude 에서 인자가 없으면 `process.cwd()` 로 떨어져 **오늘과 완전히 동일**하다. 가산적 변경이라 Claude 무결손이 유지된다. 필수로 만들면 Claude 쪽 스킬·호출을 전부 고쳐야 하고 무결손 원칙이 깨진다.
- 스킬/도구 description 에 "Codex 에서는 워크스페이스 절대경로를 전달" 명시.

**코드베이스에 이미 있는 선례를 따를 것** (새 패턴을 발명하지 말 것):

- `imbas astSearch.ts:36` — `input.path ?? process.cwd()`
- `filid bootSweep.ts:17` — `cwd: string = process.cwd()` 인자
- `r-statistics` — `R_STATISTICS_DATA_ROOT` env 오버라이드
- `maencof` — `MAENCOF_VAULT_PATH` env 오버라이드
- `cennad core/projectHash` — INTENT.md 에 "호출자가 cwd 를 명시 전달, `process.cwd()` 기본값 금지" 규약이 이미 있다

**imbas(15 지점) 는 전략 결정이 필요하다**: 도구마다 인자를 붙이면 표면이 폭증한다. 세션당 1회 프로젝트 루트를 세우는 방식(초기화 도구 또는 첫 호출값 캐시)이 대안이다. 착수 시 imbas 도구 표면을 보고 정한다.

**재분류 검토 2건**: `imbas/src/ast/astGrepShared/astGrepShared.ts:43` 과 `filid/src/ast/astGrepShared/utils/getSgModule.ts:20` 은 프로젝트가 아니라 **`@ast-grep/napi` 모듈 해석 기준**으로 cwd 를 쓴다. Codex 에서 cwd = 플러그인 루트면 오히려 **맞는** 동작일 수 있다 — B 로 뭉뚱그리지 말고 따로 판단할 것.

## 4. 절대 조건 — Claude 무결손

`OGHAM_HOST` 부재(= Claude)에서 **전 플러그인 테스트가 현행과 동일하게 통과**해야 한다. 협상 대상이 아니다: in-place 어댑터 체제의 존재 이유가 "Claude 는 손대지 않는다" 이기 때문이다. 모든 분기는 **가산적**으로 — 기존 경로를 바꾸지 말고 옆에 추가한다.

## 5. 남은 미결 — agy

`mcp_config.json`(agy) 스키마에는 **`cwd` 필드가 없다** → codex 처럼 "cwd 가 곧 플러그인 루트" 수법을 쓸 수 없다. agy 축은 아직 미실측(게이트 G4)이므로 **`pluginRoot()` 의 agy 분기는 비워두고**, 그 전까지 agy 지원을 주장하지 않는다.

## 6. 완료 기준

- **Claude**: `OGHAM_HOST` 부재에서 전 플러그인 테스트가 현행과 동일 통과.
- **Codex**: `r-statistics run_r` 이 `contract.R` 을 찾고, 사용자 데이터 경로가 allow-root 를 통과한다.
- **Codex**: imbas 도구가 사용자 프로젝트를 대상으로 동작한다.
- **Codex**: deilen 뷰어의 프로젝트 해시가 프로젝트별로 갈린다.
- **Codex**: filid `syncRuleDocs` 가 `skipped` 없이 실제로 배포한다.
