# Migration Playbook — in-place 멀티호스트 적용 절차

> **상태: 채택 — 진행 중 (2026-07-14).** Claude 산출물을 정본으로 두고 Codex·Antigravity 어댑터 파일을 병치하는 in-place 체제의 적용 절차. 아키텍처는 [compiler-architecture.md](./compiler-architecture.md), 실측 근거는 [host-capability-matrix.md](./host-capability-matrix.md).

## 0. 결정 기록

- **2026-07-12 (보류)**: codex 0.144.1 실측 "플러그인 훅 전면 불가" 를 1차 근거로 `definitions/`→`targets/` 재배치를 착수하지 않기로 결정. SessionEnd→MCP 수명주기 이관만 수용([sessionend-refactor.md](./sessionend-refactor.md) — 완료·유지).
- **2026-07-14 (전환·재개)**: codex 0.144.4 재실측 + openai/codex main 소스 검증 + ponytail 실증으로 훅 블로커 해소 확인. 재배치 대신 **in-place 어댑터**로 전환 — Claude 파일 무수정, 어댑터 4종 생성. 구 재배치 도구·스펙은 커밋 `6378169a` 이력으로 은퇴.
- **불변 원칙**: Claude 100% 무결손(도구가 Claude 소비 파일을 쓰지 않음 — 구조 보장), 어댑터 손편집 금지(정본 수정 → 재생성), 부분 이식 시 손실은 matrix §7 로 명시 고지.

## 1. 최종 상태 (이 체제가 완성하는 것)

```
ogham/
├── .claude-plugin/marketplace.json     정본 (Claude 설치 · agy 재사용 · Codex fallback)
├── .agents/plugins/marketplace.json    [생성] Codex: codex plugin marketplace add <repo>
├── .agents/plugins.json                [생성] agy: 클론 즉시 declared 활성화
└── plugins/<pkg>/
    ├── (현행 Claude 산출물 전부 — 무수정)
    ├── .codex-plugin/plugin.json       [생성] Codex 매니페스트 (skills·hooks 명시 + 인라인 mcpServers)
    └── mcp_config.json                 [생성] agy MCP (MCP 보유 플러그인만)
```

설치 채널 (사용자 안내 문구의 정본):

| 호스트 | 설치                                                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Claude | `/plugin marketplace add vincent-kk/ogham` → `/plugin install <pkg>@ogham` (현행 그대로)                                        |
| Codex  | `codex plugin marketplace add vincent-kk/ogham` → `codex plugin add <pkg>@ogham` → TUI **`/hooks` 에서 trust 승인** → 새 스레드 |
| agy    | ⚠ **`agy plugin install` 은 쓰면 안 된다** — MCP 가 로드되지 않는 위치에 설치한다. 플러그인 디렉터리를 `~/.agents/plugins/<pkg>/` 로 복사/심링크해야 한다 (실측 §3.2). declared(`.agents/plugins.json`)도 무용지물. |

## 2. 어댑터 생성·유지 절차 (상시 운영 규칙)

도구: [`tools/plugin-compiler`](../../tools/plugin-compiler/) (CLI 계약은 그 DETAIL.md 참조).

```bash
yarn plugin:adapters          # 전 플러그인 + 루트 어댑터 재생성 (변경분만 쓰기)
yarn plugin:adapters:check    # 재생성-비교만 — 불일치·호환성 error 시 exit 1
```

- **언제 실행하나**: `.claude-plugin/plugin.json`·`.mcp.json`·`hooks/hooks.json`·`skills/` 존재 여부가 바뀌는 모든 변경 후, 그리고 릴리즈 전. 버전 필드는 `version:sync`(`scripts/inject-version.mjs`)가 `.claude-plugin` 과 `.codex-plugin` 을 함께 동기화한다.
- **신규 플러그인 추가 시**: Claude 산출물을 평소처럼 완성 → 루트 `.claude-plugin/marketplace.json` 에 항목 추가 → `yarn plugin:adapters` → 생성물 커밋. 끝.
- **금지**: 어댑터 4종 손편집(재생성에 덮임), Claude 산출물에 호스트 분기 로직 주입(호스트 분기는 훅 런타임의 env 감지 — `PLUGIN_DATA` = Codex — 로만).
- npm 배포 파리티: 각 플러그인 `package.json:files` 에 `.codex-plugin`·`mcp_config.json` 포함(마켓플레이스 설치는 git 디렉터리 복사라 무관하나, npm tarball 과 디렉터리 내용을 일치시킨다).

## 3. 실측 게이트 (Stage 1 — 실사용 선언 전 닫을 것)

정의 정본. 결과는 이 표에 기록하고 [host-capability-matrix.md](./host-capability-matrix.md) §6 을 동기화한다.

| #   | 게이트                                                                                                                                 | 방법                                                                                            | 실패 시 대응                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| G1  | Codex 플러그인 MCP 도구명 형식·플러그인 스코프 (서버명 `tools`/`t` 충돌 여부)                                                          | ogham 플러그인 2개+ 동시 설치, TUI 도구 목록·호출 확인                                          | 서버명=플러그인명 오버라이드가 이미 방어 — 형식만 기록                               |
| G2  | `codex exec` 헤드리스에서 훅 거동 (신뢰됨/미신뢰 각각)                                                                                 | trust 승인 전후 `codex exec` 실행, 훅 발화·행 여부 확인                                         | cennad codex 위임 경로에 훅 미발화 고지 또는 trust 선행 안내                         |
| G3  | 플러그인 버전 업 → 훅 파일 해시 변경 시 재신뢰 UX                                                                                      | ponytail 또는 ogham PoC 로 버전 업 후 훅 상태 확인                                              | 릴리즈 노트에 `/hooks` 재승인 안내 문구 표준화                                       |
| G4  | agy `mcp_config.json` 상대 args 해석 기준 (플러그인 루트 vs 세션 cwd)                                                                  | agy 인터랙티브 설치 + MCP 기동 stderr 마커 (**agy 1.1.2 로 재실측** — matrix 사실은 1.1.1 기준) | agy emitter 를 설치-시-절대경로 주입으로 교체                                        |
| G5  | agy 가 `hooks/hooks.json`(Claude 포맷)을 자동 로드해 오독하는지 (ponytail 의 회피 관행이 시사)                                         | agy 에 훅 보유 플러그인 설치, validate/로그 확인                                                | 훅 파일을 `hooks/claude-hooks.json` 등으로 개명 + 매니페스트 명시 (Claude 동작 불변) |
| G6  | skill 본문의 Claude full-form 도구명(`mcp__plugin_…`)이 Codex/agy 모델을 오도하는 정도                                                 | Codex 에서 대표 스킬 실사용 관찰                                                                | 서술형 참조로 완화(정본 수정이므로 별도 결정) 또는 AGENTS.md 보완                    |
| G7  | `process.cwd()` 의존 런타임 (Codex 플러그인 MCP 는 cwd=플러그인 루트 고정)                                                             | deilen `preview`(상대 경로 인자) 를 Codex 에서 실행                                             | 해당 서버만 세션 cwd 를 env/인자로 수신하도록 보강                                   |
| G8  | Codex 의 규칙 파일 의미론 — `~/.codex/rules` 디렉토리의 실제 로드 규약, `AGENTS.md`(전역 `~/.codex/AGENTS.md`·저장소 루트) 주입 등가성 | Codex 에 규칙 파일 배치 후 컨텍스트 반영 확인                                                   | filid rules 배포의 Codex 타깃을 AGENTS.md 병합 방식으로 조정                         |

권장 PoC 순서: **r-statistics 또는 deilen**(MCP only, 훅 없음)으로 G1·G6·G7 → **maencof-lens**(SessionStart 1종)로 G2·G3·G5 → **cennad**(훅 2종 + 자기참조)로 위임 경로 점검.

> ⚠ **등록 경로 필수 조건**: 마켓플레이스로 등록할 체크아웃에 어댑터가 **생성되어 있어야** 한다. 어댑터 없는 클론(예: 아직 머지 전인 `main` 작업본)을 등록하면 Codex 가 §5.1 탐색 순서대로 `.claude-plugin` fallback 으로 떨어져 변수 args 가 든 `.mcp.json` 을 읽는다 — 어댑터를 타지 않는 **가짜 PoC** 다. 등록 직전 `find plugins -maxdepth 3 -path '*/.codex-plugin/plugin.json' | wc -l` 이 10 인지 확인한다.

### 3.1 실측 결과 — Codex 축 1차 (2026-07-15, codex-cli 0.144.4)

PoC: 로컬 마켓플레이스 `ogham` 등록 + `deilen`·`r-statistics`(MCP only, 훅 없음) 동시 설치.

| #      | 결과                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **G1** | ✅ **닫힘 (단, 블로커 1건 발견·수정)**. 도구명은 `mcp__<server>__<tool>` — **더블 언더스코어**이며 0.144.1 의 `mcp__<server>.<tool>` 은 폐기. `sanitize_name` 으로 `r-statistics`→`r_statistics`. **플러그인 스코프는 없다** (Codex 시스템 프롬프트: "use tool provenance to tell which plugin they come from") → 서버명=플러그인명 오버라이드는 방어책이 아니라 **필수**다(ogham 은 `tools`×6·`t`×3 이 전역 충돌한다). 실측 도구명: `mcp__deilen__render_viewer`·`mcp__r_statistics__run_r` 등 8개.                                                                                                                                                                                             |
| **G6** | ✅ **닫힘 (양호)**. Codex 가 스킬을 `<plugin>:<skill>` 접두로 주입 — Claude 의 `/<plugin>:<skill>` 규약과 동일. 설명·한국어 트리거 원문 유지. **단** 스킬 본문의 Claude full-form(`mcp__plugin_deilen_tools__render_viewer`)은 실제 Codex 도구명(`mcp__deilen__render_viewer`)과 **불일치가 확정**됐다(미실측 아님) — 완화책은 Stage 5.                                                                                                                                                                                                                                                                                                                                                          |
| **G7** | ✅ **닫힘 (제약 확정 — matrix §9 가 상세 정본)**. Claude 는 MCP 프로세스에 **프로젝트(cwd)와 플러그인 위치(`CLAUDE_PLUGIN_ROOT` env)를 분리 제공**하지만 Codex 는 **둘 다 안 주고** cwd 하나를 두 용도가 다투게 한다(env=`OGHAM_HOST` 뿐, MCP 표준 `roots` 도 미지원 — 프로토콜 프로브로 확인: capabilities 에 roots 없음, `roots/list`→`[]`). ⇒ 런타임 코드는 Claude 계약 하에선 정상이며 **Codex 전환 고유 문제**다. **(A) 플러그인 자기 파일**(r-statistics `contract.R` — 현재 폴백 경로 미존재로 `run_r` 파손)은 `process.cwd()` 분기로 해결 가능. **(B) 사용자 프로젝트 경로**(r-statistics data-root · deilen 프로젝트 해시)는 **모델이 인자로 넘기는 수밖에 없다**. → Stage 4 결정 대상. |

**훅 축 (2026-07-15 추가 — maencof-lens SessionStart 설치)**

| #      | 결과                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **G2** | ✅ **닫힘 — ogham 훅 끝까지 검증**. **신뢰된 훅은 `codex exec` 헤드리스에서 발화한다**: maencof-lens 훅을 trust 한 뒤 SessionStart 가 2회(ponytail + ogham) 발화하고 프로세스도 관측됐으며, **모델이 주입 문구 `[maencof-lens] Read-only vault access enabled.` 를 그대로 인용**했다. ⇒ `${CLAUDE_PLUGIN_ROOT}` 쉘 전개 · `libs/run.cjs` 런처 · **Claude 포맷 `hooks/hooks.json` 공유** · `hookSpecificOutput.additionalContext` → 모델 주입이 **전부 동작**한다. **미신뢰 훅은 조용히 건너뛴다** — exit 0 완주, **경고 한 줄 없고** 프로세스도 안 뜬다. ⇒ **cennad 의 codex 위임 경로는 trust 승인 전까지 ogham 훅이 무동작이고 사용자는 알 수 없다.** 우회로: `codex exec --dangerously-bypass-hook-trust`. **훅 프로세스는 세션 cwd 를 받는다**(훅이 `<세션cwd>/.maencof-lens/config.json` 을 찾아냄 — MCP 와 달리 훅은 경로 문제 없음, matrix §9). |
| **G3** | ✅ **닫힘**. `codex plugin add` 는 플러그인을 `enabled` 로만 만들고 **훅 신뢰는 등록하지 않는다**. 이후 첫 TUI 진입에서 게이트가 뜬다 — `Hooks need review / 1 hook is new or changed / Hooks can run outside the sandbox after you trust them` → `1. Review hooks · 2. Trust all and continue · 3. Continue without trusting (hooks won't run)`. 신뢰는 `config.toml` `[hooks.state."<plugin>@<mp>:<훅파일>:<event>:<i>:<j>"]` 의 `trusted_hash` 로 고정된다. **"new or changed"** 가 곧 재신뢰 트리거 — 버전 업으로 훅 파일이 바뀌면 재승인을 요구한다.                                                                                                                                                                                                                                                                                              |

### 3.2 실측 결과 — agy 축 (2026-07-15, agy 1.1.2)

| #      | 결과                                                                                                                                                                                                                                                                                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **G4** | ✅ **닫힘 — 질문 자체가 틀렸다**. 상대 args 는 **플러그인 디렉터리 기준으로 정상 해석**된다(우리 `mcp_config.json` 무수정 유효, `OGHAM_HOST` 도 보존). **진짜 문제는 위치**다 — `agy plugin install` 이 넣는 `~/.gemini/config/plugins/` 에서는 **MCP 가 아예 안 뜬다**(설치 로그는 `✔ mcpServers : 1 processed` 라고 거짓 안심을 준다). `~/.agents/plugins/<n>/` 또는 워크스페이스 `.agents/plugins/<n>/` 에 두면 **정상 기동**한다(대조군: 전역 `mcp_config.json` 도 정상 → agy 의 stdio MCP 자체는 멀쩡). |
| **G5** | ✅ **닫힘 — 오독 확정**. agy 가 `hooks/hooks.json` 을 루트 `hooks.json` 으로 복사한 뒤 Claude 포맷을 **훅 이름 `"hooks"`** 로 오독해 파싱 실패한다: `invalid hook "hooks": command hook must specify 'command'` → `loaded 0 named hooks`. 세션은 안 깨지지만 **agy 훅 전면 무동작**. → Stage 3(agy 포맷 emitter + 러너 어댑터).                                                              |

**부수 발견 (어댑터 설계 변경 필요)**

- **루트 `plugin.json` 이 필수다**: 없으면 agy 가 `source: claude-code` 로 임포트하며 **우리 `mcp_config.json` 을 `.mcp.json` 에서 재생성해 덮어쓴다** — `${CLAUDE_PLUGIN_ROOT}` 리터럴 + `env: null` 로 **`OGHAM_HOST` 마커가 파괴**된다. `{"name":"<n>"}` 한 줄을 두면 `source: antigravity` 로 분류되고 어댑터가 온전히 보존된다.
- **`.agents/plugins.json` (declared) 은 무용지물**: 항목별 경로·컨테이너 경로·마커 조합 3종 모두 실패. **폐기 대상.**

### 3.3 실측 결과 — G8 Codex 규칙 채널 (2026-07-15)

✅ **닫힘 — 기존 가정이 틀렸다.** `~/.codex/rules/` 는 지침 문서 채널이 **아니다** — `prefix_rule(pattern=["yarn","test:run"], decision="allow")` 형태의 **쉘 커맨드 승인 allowlist**(Claude `settings.json` permissions 대응)다. Codex 의 지침 채널은 **`AGENTS.md` 뿐**이고, **저장소 루트 `AGENTS.md` 와 전역 `~/.codex/AGENTS.md` 가 둘 다 주입되며 함께 쌓인다**(마커로 실측). `.claude/rules/*.md` 는 무시된다. ⇒ **filid `syncRuleDocs`·maencof `claudeMdMerger` 의 Codex 타깃 = `AGENTS.md` 병합** (Stage 4).

**발견된 블로커 (수정 완료)**: `.codex-plugin/plugin.json` 의 `mcpServers` 에 `cwd` 를 **생략하면** Codex 는 세션 cwd 로 서버를 띄운다. 상대 args(`bridge/mcp-server.cjs`)가 사용자 프로젝트 기준으로 풀려 **module-not-found → initialize 중 즉사**하고, `codex exec` 는 이 실패를 **조용히 삼킨다**(TUI 만 `⚠ MCP client for X failed to start` 경고). 즉 **MCP 보유 9개 플러그인 전체가 Codex 에서 무음 사망**하던 상태였다. matrix §4.1 의 "cwd 생략 시 플러그인 루트가 기본(소스 확정)" 은 0.144.4 실측으로 **반증**됐다.

→ 대응: emitter 가 `"cwd": "."` 를 명시 방출(`buildCodexMcpServers`). 설치 경로(`~/.codex/plugins/cache/<mp>/<plugin>/<version>`)는 생성 시점에 알 수 없어 절대 args 는 불가능하므로 **유일 해법**이다. 재설치 후 TUI 경고 0건 · 헤드리스 exec 에서 도구 8개 노출 확인.

## 4. 잔여 Stage (게이트 통과 후)

- **Stage 2 — 배선**: CI 에 `yarn plugin:adapters:check` 편입(clean-regen 게이트, `ci.yml` paths 에 `.codex-plugin`·`mcp_config.json`·`.agents/**` 포함), README(사용자용)에 Codex/agy 설치 절 추가.
- **Stage 3 — agy 러너 어댑터** (agy 실사용 채택 시): `libs/run.cjs` 확장 또는 자매 러너 — camelCase stdin→Claude 계약 정규화, `SessionStart→PreInvocation` once-guard(conversationId 기록 방식), matcher 번역, agy 훅 `hooks.json`(named-group) emitter 를 도구에 추가. 이전 설계 그대로 유효(matrix §4.3).
- **Stage 4 — 호스트 결합 런타임 분기** · **설계 정본: [stage4-host-paths.md](./stage4-host-paths.md)** (근거 포함 · 정본 체크아웃 `~/Workspace/ogham` 에서 진행). 2026-07-15 실측으로 범위가 크게 넓어졌다 — Codex MCP 는 `cwd:"."` 로 서버는 뜨지만 **`process.cwd()` 를 프로젝트로 가정하는 8 플러그인 / 31 지점이 전부 플러그인 루트를 본다**(imbas 15 지점 = 사실상 전 기능). 플러그인 런타임이 호스트 고정 경로를 쓰는 지점을 `OGHAM_HOST` env(어댑터가 MCP 선언에 주입 — codex/agy; 부재=claude) 분기로 일반화한다. 훅 프로세스는 `PLUGIN_DATA` 유무로 Codex 를 감지(ponytail 패턴). 확인된 대상:
  - **maencof `claudeMdMerger`** (`CLAUDE.md` 읽기/쓰기 — `constants/claudeMd.ts`) → Codex 에서는 `AGENTS.md` 대상화.
  - **filid `rule_docs_sync`/`syncRuleDocs`** (`.claude/rules/*.md` 배포) → Codex 규칙 채널(G8 실측 후 `~/.codex/rules` 또는 AGENTS.md 병합)로 대상화. 훅 주입 문구의 `.claude/rules/…` 경로 언급도 함께 분기.
  - 신규 플러그인에서 호스트 고정 경로(`CLAUDE.md`·`.claude/**`)를 쓰게 될 때는 처음부터 이 분기 헬퍼를 경유한다 — 반복 패턴의 정본 규칙.
- **Stage 5 — Codex 심화** (필요 시): maencof 레코더의 도구명 정규화(Codex `Bash`/`apply_patch`/`mcp__t__*` → 내부 매칭), filid Read 추적의 Codex 보완(read 계열 도구명 실측 후 matcher 확장), agents 컴포넌트 대안(위원회 의존 스킬의 Codex 거동 정의), `commandWindows` 병기(Windows).

## 5. 알려진 격차 (사용자 고지 문안의 근거 — matrix §7 요약)

- Codex: subagent 위원회(filid Phase D·prawf·atlassian 미디어) 미이식 — agents 컴포넌트 부재. filid/imbas 의 Read 기반 추적 부분 손실. maencof 자동 기록은 도구명 정규화 전까지 부분 무동작. **호스트 결합 쓰기(maencof CLAUDE.md·filid .claude/rules)는 Stage 4 분기 전까지 Claude 경로에 그대로 쓴다**(Codex 컨텍스트에 미반영). cennad 는 codex 안에서 codex 로 재위임(순환 아님 — 새 exec 스폰이지만, provider 기본값 조정 여지).
- agy: 훅 전 기능이 Stage 3 러너 어댑터 전까지 미동작(skills·agents·MCP 는 즉시).

## 6. 재개 함정 체크리스트 (구 결정에서 승계·재검증)

1. ~~inject-version.mjs 컷오버 파손~~ → in-place 라 컷오버 없음. 대신 `.codex-plugin/plugin.json` version 동기화가 inject-version.mjs 에 추가됨 — 플러그인에 `.codex-plugin` 이 없으면 조용히 skip 하는지 확인.
2. ~~r-statistics `shared/contract.R` 누락~~ → in-place 라 산출물 재배치 없음. `${CLAUDE_PLUGIN_ROOT}/shared/contract.R` 런타임 참조는 Codex 훅 env 주입으로도 유효하나, **MCP 서버 프로세스에는 그 env 가 없다** — r-statistics 서버가 이 경로를 어떻게 해석하는지 G1 PoC 에서 함께 확인.
3. ~~verify 게이트 소멸~~ → `plugin:adapters:check` 가 상설 clean-regen 게이트로 대체.
4. CI paths 필터 — **job 편입만으로는 무효**: 현행 `ci.yml` 은 `**.json` 을 명시 배제하고(주석: "config/manifest-only (`**.json`) 변경은 매트릭스를 건너뛴다") `**.ts`~`**.cjs` 만 트리거한다. 어댑터 21개는 전부 `.json` 이므로, paths 에 `.codex-plugin/**`·`**/mcp_config.json`·`.agents/**` 를 추가하기 전에는 어댑터만 손편집·desync 된 커밋에서 **CI 자체가 돌지 않는다**. Stage 2 에서 paths 추가와 `plugin:adapters:check` 편입은 한 쌍으로 처리한다.
