# Stage 4 — 호스트 경로 해석 (정본 수정 방향 · 근거 포함)

> **상태: 미착수 — 수정 방향 기록 (2026-07-15).** 이 문서는 **플러그인 런타임(정본) 수정**의 설계서다. 어댑터/도구 작업(`feature/issue-78-1`)과 분리되며 **정본 작업 체크아웃(`~/Workspace/ogham`)에서 진행한다.**
> 사실 근거는 [host-capability-matrix.md §9](./host-capability-matrix.md), 게이트 맥락은 [migration-playbook.md](./migration-playbook.md) G7.

## 0. 왜 이 수정이 필요한가 (한 문단)

Codex 어댑터가 완성되어 ogham 플러그인이 Codex 에 설치되고 MCP 서버도 뜬다. **그런데 도구를 부르면 엉뚱한 디렉터리를 본다.** MCP 서버가 "사용자 프로젝트"라고 믿는 `process.cwd()` 가 Codex 에서는 **플러그인 설치 폴더**이기 때문이다. imbas 는 전 기능이, r-statistics 는 `run_r` 이 이 이유로 무너진다. 현행 코드가 틀린 게 아니라 — Claude 계약 하에서는 완벽히 옳다 — **Codex 가 Claude 와 다른 계약을 주기 때문**이고, 그 차이를 런타임이 흡수해야 한다. 어댑터(파일 생성)로는 흡수할 수 없는 유일한 잔여 격차다.

## 1. 왜 Codex 에서 좌표를 잃는가 — 강제된 인과 사슬

MCP 서버 런타임은 **서로 다른 두 경로**를 쓴다.

| 좌표                                 | 무엇에 쓰는가                                   | Claude (실측)              | Codex (실측)                                |
| ------------------------------------ | ----------------------------------------------- | -------------------------- | ------------------------------------------- |
| **A. 플러그인 루트** (자기 파일)      | 번들 자산 · R 계약 스크립트 · 설정 HTML         | `CLAUDE_PLUGIN_ROOT` env   | ❌ env 없음 — 단 `process.cwd()` 가 곧 이것 |
| **B. 프로젝트 루트** (사용자 작업물)  | 프로젝트 식별 · 파일 대상 연산 · allow-root     | `process.cwd()`            | ❌ **알 방법이 전혀 없음**                  |

Claude 는 둘을 **분리해서** 준다(실측 `ps eww`: `PWD=~/Soulstream/tirnanog`, `CLAUDE_PLUGIN_ROOT=…/plugins/deilen`). Codex 는 둘 다 안 주고, 게다가 cwd 하나를 두 용도가 다투게 만든다. 왜 그렇게 되는지가 중요하다 — **선택이 아니라 강제**다:

1. 어댑터는 저장소에서 생성되는데, **설치 경로**(`~/.codex/plugins/cache/<mp>/<plugin>/<version>`)는 생성 시점에 **알 수 없다** → MCP `args` 에 절대경로를 박을 수 없다.
2. 그래서 args 는 상대경로(`bridge/mcp-server.cjs`)일 수밖에 없다.
3. 상대 args 가 풀리려면 프로세스 cwd 가 **플러그인 루트**여야 한다 → 어댑터가 `cwd:"."` 를 방출한다. (안 하면 Codex 는 세션 cwd 로 띄우고 서버가 module-not-found 로 즉사한다 — matrix §4.1. 이게 실제로 MCP 9종 전체가 무음 사망하던 원인이었다.)
4. cwd 를 A 에 써버렸으므로 **B 를 담을 그릇이 없다.**

그리고 B 를 되찾을 **다른 채널도 전부 막혀 있다**(전부 실측):

- **env**: MCP 프로세스의 env 는 어댑터가 넣은 `OGHAM_HOST` **단 하나**다. 세션 cwd 힌트가 없다. (훅 프로세스에는 Codex 가 `CLAUDE_PLUGIN_ROOT`·`PLUGIN_DATA` 를 주입하지만 **MCP 에는 주입하지 않는다**.)
- **MCP `roots` 프로토콜**: 프로토콜 프로브 결과 `codex-mcp-client 0.144.4` 는 `roots` capability 를 **선언하지 않고**, 역질의 `roots/list` 에 `{"roots": []}` 를 돌려준다.
- **cwd**: 위 3번에서 이미 A 가 차지했다.

⇒ **서버 안에서는 B 를 알 수 없다.** 이것이 §3.3 설계(모델이 인자로 넘긴다)가 우아해서가 아니라 **유일해서** 선택되는 이유다.

**훅은 대상이 아니다** — Codex 는 훅에 `CLAUDE_PLUGIN_ROOT`·`PLUGIN_DATA` 를 주입하고 cwd 도 세션 기준이다. 이 문서는 **MCP 서버 런타임만** 다룬다.

## 2. 무엇이 어떻게 깨지는가 (MCP 도달 코드 전수, 2026-07-15)

### A — `CLAUDE_PLUGIN_ROOT` 의존: 6 플러그인 / 7 지점

env 가 없으니 각자의 폴백으로 떨어지는데, **폴백이 안전한 곳과 아닌 곳이 갈린다.**

| 플러그인       | 지점                                                                                                 | Codex 에서 벌어지는 일 · 왜 고쳐야 하나                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `r-statistics` | `constants/paths.ts:43` `contractScriptPath()`                                                       | 🔴 `~/.claude/plugins/r-statistics/shared/contract.R` 로 폴백 → **그 경로는 실재하지 않는다**(확인함) → `run_r` 이 실행 계약을 못 찾아 **파손**. 실제 파일은 설치 루트에 있고, 그게 곧 `process.cwd()` 다. |
| `filid`        | `core/infra/configLoader/utils/resolvePluginRoot.ts:3` · `mcp/tools/ruleDocsSync/ruleDocsSync.ts:126` | 🟡 `null` → `syncRuleDocs` 가 `skipped` 반환. 에러가 아니라 **조용한 무동작** — 사용자는 규칙이 배포된 줄 안다. 무음 실패라 더 위험하다. |
| `atlassian`    | `mcp/tools/setup/utils/loadSettingsHtml.ts:27`                                                        | 🟡 설정 UI HTML 을 못 찾아 setup 도구가 실패할 수 있다.                                                                     |
| `cennad`       | `mcp/tools/openSettings/utils/loadSettingsHtml.ts:28`                                                 | 🟡 동일.                                                                                                                    |
| `entrez`       | `mcp/tools/setup/utils/loadSettingsHtml.ts:16`                                                        | 🟢 모듈 위치 기반 walk-up 폴백 보유 → 저위험. 그래도 헬퍼로 통일하면 폴백에 기대지 않는다.                                  |
| `deilen`       | `mcp/httpServer/utils/bridgeRoot.ts:14`                                                               | 🟢 동일하게 walk-up 폴백 보유 → 저위험.                                                                                     |

### B — `process.cwd()` 를 프로젝트로 가정: 8 플러그인 / 31 지점

여기는 폴백이 없다. **전부 조용히 플러그인 폴더를 본다.**

| 플러그인       | 지점 수 | 왜 심각한가                                                                                                       |
| -------------- | ------- | ----------------------------------------------------------------------------------------------------------------- |
| `imbas`        | **15**  | 🔴 도구 대부분이 프로젝트 대상(매니페스트·플랜·전이). 프로젝트가 플러그인 폴더로 바뀌면 **사실상 전 기능 무의미**. |
| `deilen`       | 5       | 🟡 `getProjectHash(process.cwd())` — 모든 프로젝트가 **한 버킷으로 붕괴**. 렌더는 되지만 뷰어 세션·피드백이 프로젝트 간 섞인다(격리 손실). |
| `filid`        | 4       | 🟡 bootSweep·세션 캐시 정리·shutdown ctx 가 엉뚱한 루트를 청소 대상으로 삼는다.                                    |
| `cennad`       | 2       | 🔴 projectHash 붕괴 + **위임 프로세스를 플러그인 폴더에서 spawn** → 위임받은 codex/agy 가 사용자 코드를 못 본다.   |
| `maencof`      | 2       | 🟡 기록/컨텍스트가 잘못된 프로젝트에 귀속.                                                                         |
| `atlassian`    | 1       | 🟡 `utils/path.ts:9`.                                                                                              |
| `maencof-lens` | 1       | 🟡                                                                                                                 |
| `r-statistics` | 1       | 🔴 `paths.ts:54` `inputDataRoot()` = R 작업 allow-root. 플러그인 루트가 되면 **사용자 데이터가 allow-root 밖** → A 를 고쳐도 `run_r` 은 여전히 쓸 수 없다. |

**결론**: `cwd:"."` 는 서버를 **살렸을 뿐** 의미를 고치지 못했다. 이 Stage 없이는 Codex 에서 imbas·cennad·r-statistics 는 실질 사용 불가이고 나머지도 정확성이 무너진다.

## 3. 설계 (선택의 근거 포함)

### 3.1 헬퍼의 집 — `@ogham/cross-platform` (`./host-paths` 추가)

**왜 여기인가**: 10개 중 **8개 플러그인이 이미 이 패키지를 의존**하고 `./paths`·`./env` 서브패스가 이미 있다. 새 공유 패키지를 만들면 의존 그래프에 간선과 노드가 늘고 FCA DAG 관리 비용이 붙는데, **그럴 이유가 없다.** 플러그인별로 헬퍼를 복제하면 8벌이 표류한다.

```ts
export type Host = "claude" | "codex" | "agy";

/** 어댑터가 MCP 선언에 주입한 마커. 부재 = claude — Claude `.mcp.json` 은 무수정이므로 마커가 없다. */
export function detectHost(): Host;

/** A. 플러그인 루트. */
export function pluginRoot(): string | null;
//  claude → process.env.CLAUDE_PLUGIN_ROOT ?? null
//  codex  → process.cwd()      ← 어댑터가 cwd:"." 로 고정했기 때문에 성립한다 (비자명한 결합 — 주석 필수)
//  agy    → 미정 (G4 실측 후. mcp_config.json 스키마엔 cwd 필드가 없어 같은 수법을 못 쓴다)

/** B. 프로젝트 루트. */
export function projectRoot(explicit?: string): string;
//  explicit 우선 (절대경로)
//  claude → process.cwd()
//  codex  → explicit 없으면 throw
```

**왜 codex 에서 `projectRoot()` 가 폴백하지 않고 throw 하는가**: 폴백할 곳이 `process.cwd()` = 플러그인 루트뿐인데, 그건 **지금 벌어지고 있는 조용한 오동작 그 자체**다. 사용자 데이터를 플러그인 폴더에서 찾고, 남의 프로젝트 해시로 뷰어를 열고, 엉뚱한 곳을 청소한다. **명시적 실패가 조용한 오동작보다 낫다** — 이 원칙이 이 설계의 핵심이다.

**왜 `pluginRoot()` 는 codex 에서 `process.cwd()` 로 되는가**: §1 의 3번 때문이다. 어댑터가 `cwd:"."` 를 방출하지 않으면 서버가 아예 안 뜬다. 즉 **서버가 살아있다는 사실 자체가 cwd = 플러그인 루트를 보장**한다. 이 결합은 코드만 봐선 안 보이므로 반드시 주석으로 남긴다.

### 3.2 A 의 적용 — 기계적, 위험 없음

각 지점의 `process.env.CLAUDE_PLUGIN_ROOT` 를 `pluginRoot()` 로 교체하면 끝난다. **모델 개입 없음, 스킬 변경 없음, Claude 동작 불변.** r-statistics `contract.R` 이 이걸로 살아난다. 먼저 해도 되는 저위험 구간이다.

### 3.3 B 의 적용 — 모델이 넘기는 수밖에 없다

**왜 모델인가**: §1 에서 서버 쪽 채널(env·roots·cwd)이 전부 막혔음을 확인했다. 반면 **모델은 세션 워크스페이스 경로를 안다**(Codex TUI 가 `directory: ~/Workspace/ogham_mk2` 를 표시하고 시스템 컨텍스트에 들어간다). 두 좌표를 다 아는 유일한 주체다.

- 프로젝트 대상 MCP 도구 스키마에 **선택 인자** `projectRoot?: string`(절대경로)를 추가한다.
- 런타임은 `projectRoot(args.projectRoot)` 로 해석한다.
- **왜 선택 인자인가**: Claude 에서는 인자가 없으면 `process.cwd()` 로 떨어져 **오늘과 완전히 동일**하다. 가산적 변경이라 Claude 무결손이 유지된다. 필수 인자로 만들면 Claude 쪽 스킬·호출을 전부 고쳐야 하고 무결손 원칙이 깨진다.
- 스킬/도구 description 에 "Codex 에서는 워크스페이스 절대경로를 전달" 을 명시한다.

**imbas(15 지점) 는 전략 결정이 필요하다**: 도구마다 인자를 붙이면 표면이 폭증한다. 세션당 1회 프로젝트 루트를 세우는 방식(초기화 도구 또는 첫 호출값 캐시)이 대안이다. **이 문서에서 결론내지 않는다** — 착수 시 imbas 도구 표면을 보고 정한다.

**선례**: cennad `core/projectHash` 는 이미 "호출자가 cwd 를 명시 전달, `process.cwd()` 기본값 금지" 규약을 쓴다(INTENT.md). B 의 참고 모델로 삼는다.

## 4. 남은 미결

- **agy 축**: `mcp_config.json` 스키마에 `cwd` 가 **없다** → codex 처럼 "cwd 가 곧 플러그인 루트" 수법을 쓸 수 없다. **G4 실측 후** `pluginRoot()` 의 agy 분기를 확정한다. 그 전에는 agy 를 이 헬퍼로 지원한다고 주장하지 않는다.
- **호스트 결합 쓰기**(별건, 기존 Stage 4 항목): maencof `CLAUDE.md`→`AGENTS.md`, filid `.claude/rules/`→Codex 규칙 채널(G8). 상태 디렉터리를 `~/.claude` 밑에 만드는 `deilen/constants/paths.ts:5`·`r-statistics` `R_STATISTICS_HOME` 도 같은 분기에 얹는다 — 지금은 Codex 로 돌려도 Claude 폴더에 상태를 쓴다.

## 5. 완료 기준

- **Claude 무결손**: `OGHAM_HOST` 부재에서 전 플러그인 테스트가 현행과 동일 통과. 이건 협상 대상이 아니다 — in-place 어댑터 체제의 존재 이유가 "Claude 는 손대지 않는다" 이기 때문이다.
- Codex 설치 후 `r-statistics run_r` 이 `contract.R` 을 찾고, 사용자 데이터 경로가 allow-root 를 통과한다.
- Codex 에서 deilen 뷰어의 프로젝트 해시가 프로젝트별로 갈린다.
- Codex 에서 imbas 도구가 사용자 프로젝트를 대상으로 동작한다.
- 손실 매트릭스(matrix §7)의 해당 행이 🔴 → 🟢 로 갱신된다.
