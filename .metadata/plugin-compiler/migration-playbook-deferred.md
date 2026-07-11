# Migration Playbook — 기존 플러그인 재배치 (보류)

> **상태: 보류 — 개발예정.** 10-플러그인 3-호스트(Claude·Codex·agy) 재배치는 2026-07-12 결정으로 **착수하지 않는다**. 수용 범위는 SessionEnd→MCP 수명주기 이관(§3 — 완료)까지. 이 문서는 재개 시점을 위한 보존 플레이북이다(원제 `TODO.md`). 도구·스펙은 커밋 `6378169a`(`tools/plugin-compiler` + 이 디렉터리), 검증 재현은 [reproduction.md](./reproduction.md).

## 보류 결정 (2026-07-12)

- **결정**: `definitions/`→`targets/` 재배치, Stage D 인프라, 3-호스트 배포를 진행하지 않는다. 컴파일러 도구와 스펙 문서는 커밋 상태로 보존하되 **빌드·CI 에 배선하지 않는다**(의도된 비활성 — `tools/plugin-compiler` 는 build 스크립트 없음·typecheck-all 미등록·루트 vitest 미포함).
- **근거**:
  1. **Codex 표현력 공백**: 플러그인 훅 채널 부재(`plugin_hooks`=removed, 선언 시 세션 행 — 실측)로 훅이 제공하는 동적 컨텍스트 주입(filid INTENT.md 주입 · cennad Live state · maencof 자동 기록)이 원리상 표현 불가. 이식본은 "같은 이름의 더 약한 제품"이 되어 기대 불일치·지원 부담을 낳는다.
  2. **부분 이식 거부 원칙**: 전부 변환 가능하지 않으면 옮기지 않는다. 플러그인×3-호스트 targets 커밋 노이즈·CI 게이트·Codex 별도 설치 UX·기능 격차 지원이 상시 비용.
  3. **연기 비용 낮음**: `extract` 가 그날의 현행 산출물에서 정본을 재생성하므로 지금 옮기지 않아도 썩는 정본이 없다.
- **완료·유지**: SessionEnd→MCP 수명주기 이관(§3, [sessionend-refactor.md](./sessionend-refactor.md)) — 호스트 이벤트 채널 의존을 제거한 이 변경은 유지한다.
- **재개 트리거**: agy(Antigravity)를 **실사용 호스트로 채택**할 때. 재개 첫 작업 = §4 **러너 어댑터**(훅 플러그인 이식의 전제); 훅 없는 5종은 §1 절차로 즉시 가능. Codex 는 재개 시에도 **훅 없는 5종만**(prawf·r-statistics·entrez·deilen·atlassian) 검토한다 — 훅 보유 5종의 Codex 이식은 하지 않는다.

## 재개 시 선결 함정 4건 (2026-07-12 코드 검증)

1. **inject-version.mjs 가 컷오버에서 깨짐**: `scripts/inject-version.mjs` 는 루트 `.claude-plugin/plugin.json` 부재 시 exit 1 — 컷오버 후 모든 `version:sync`(빌드 체인 선두)가 실패한다. 부재 시 skip 으로 선행 수정할 것(version 은 compile 시 `package.json` 에서 주입 — `loadDefinitions`).
2. **r-statistics `shared/contract.R` 누락**: 런타임이 `${CLAUDE_PLUGIN_ROOT}/shared/contract.R` 을 읽으나(`src/constants/paths.ts`) `shared` 가 `ASSET_ENTRIES`(`tools/plugin-compiler/src/constants/layout.ts`)에 없다 — 타깃에서 빠지고 **오라클에도 없어 verify 통과 + 런타임 파손**. `ASSET_ENTRIES` 에 `shared` 추가로 해소. 전 플러그인 감사 결과 엔트리 밖 pluginRoot 참조는 이 1건뿐(나머지는 전부 bridge/libs/skills/public/templates 내부).
3. **verify 게이트는 컷오버 후 소멸**: 등가 오라클 = 루트 현행 산출물(`claudeEquivalence`) — 컷오버 뒤 `verify`·`compile --check` 는 무의미해진다. 상설 게이트는 "재컴파일 → `git diff --exit-code plugins/*/targets`"(clean-regen) 방식으로 대체할 것.
4. **CI paths 필터가 정본 변경을 스킵**: `ci.yml` 이 ts/js 계열만 트리거 — `definitions/`(yaml·md·json)만 바뀐 PR 은 CI 를 건너뛴다. `plugins/**/definitions/**` 등 경로 추가 필요.

## 0. 현재 상태 vs 목표 (재개 시)

| 항목         | 현재 (루트)                                                                | 목표                                                        |
| ------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 정본         | 없음 (산출물이 곧 소스)                                                    | `definitions/` (plugin.yaml·skills·agents·hooks.json)       |
| 산출물       | `.claude-plugin`·`.mcp.json`·`skills`·`agents`·`hooks` (루트, Claude 전용) | `targets/{claude,codex,agy}/` (생성물, 커밋)                |
| 마켓플레이스 | `.claude-plugin/marketplace.json` → `./plugins/<pkg>`                      | → `./plugins/<pkg>/targets/claude` (+ codex/agy 매니페스트) |

## 1. 플러그인 1개 재배치 절차 (재배치 로직)

각 플러그인에 대해:

1. **추출**: `node --import tsx tools/plugin-compiler/src/main.ts extract plugins/<pkg>` — 현행 산출물 → `definitions/`(도구명 토큰화). 자동이나 **검토 필수**: `extract` 는 자기 플러그인 `mcp__plugin_<pkg>_<server>__<tool>` 만 토큰화하고 외부 도구 참조·bare prefix 는 리터럴로 남긴다(사용 가이드 §3).
2. **정본 검토·정리**: plugin.yaml 필드 확인(transport 포함 여부), 스킬/에이전트 토큰화 누락·오탐 확인. `{{skill:}}` 상호참조 확인.
3. **등가 확인**: `verify plugins/<pkg>` → `✓ claude equivalence OK`. **여기서 실패하면** 추출이 원본을 재현 못 한 것 — diff 를 보고 정본 수정(무결손 게이트).
4. **컴파일**: `compile plugins/<pkg>` → `targets/` 3-호스트. 진단(hook-loss 경고 등) 검토.
5. **컷오버**: 루트 산출물(`.claude-plugin`·`.mcp.json`·`skills`·`agents`·`hooks`) 제거, 마켓플레이스 source 를 `targets/claude` 로 전환. `package.json:files` 는 `targets` 로 조정(또는 배포 채널 재설계).
6. **빌드 배선**: `package.json` 에 `compile:plugin` 스텝 추가(사용 가이드 §7). 정본이 있어야 컴파일 대상이 생기므로 **마이그레이션 전에 미리 배선하면 실패한다**.

## 2. Hook 재배선 (핵심 — MCP 서버는 그대로, 훅은 배선 필요)

**MCP 서버는 그대로 쓴다**(번들 `.mcp.json` → 호스트별 mcp config 로 파일명·경로전략만 변환, 런타임 무수정). 그러나 **훅 스크립트는 호스트별 배선/재설계가 필요**하다.

| 훅 경로      | Claude                           | Codex                             | agy                                          |
| ------------ | -------------------------------- | --------------------------------- | -------------------------------------------- |
| 생성 여부    | `hooks/hooks.json` 그대로        | **생성 안 함** (플러그인 훅 불가) | `hooks.json` named-group (이벤트 매핑)       |
| 런타임 계약  | snake_case stdin (현행)          | —                                 | **camelCase stdin** → 러너 어댑터 필요       |
| SessionStart | 그대로                           | 드롭 → AGENTS.md/lazy-init 보상   | PreInvocation + **once-guard 필요**          |
| SessionEnd   | ✅ §3 완료 — 전 호스트 훅 미등록 | (동일 — MCP 수명주기 소유)        | (동일 — MCP 수명주기 소유)                   |
| PreToolUse   | 그대로                           | 드롭 → AGENTS.md 서술             | matcher 번역(Claude 도구명→agy 도구명, 근사) |

**남은 런타임 작업(Stage D)**:

- **러너 어댑터** (`libs/run.cjs` 확장 또는 `libs/run-agy.cjs`): agy camelCase stdin ↔ Claude 계약 정규화 + tool_name 역매핑(maencof PostToolUse 가 full-form 매칭). 이걸 넣어야 agy 훅이 기존 `bridge/*.mjs` 를 무수정 재사용한다. 주의: SessionStart 와 UserPromptSubmit 이 둘 다 기본 fallback `pre-invocation-once` 로 agy `PreInvocation` 에 매핑되므로 once-guard 스코프는 **이벤트별 분리** 필요(SessionStart 만 conversation-once; UPS 의 매 호출 발화 수용 여부는 실측 후 결정).
- **once-guard**: SessionStart→PreInvocation 이 매 호출 재실행되지 않도록 "마지막 실행 conversationId 기록 + 불일치 시 실행"(락파일 아님 — 좀비 방지). agy 전용.
- ✅ **MCP-부팅 sweep**: 완료 — `@ogham/session-finalizer`(shutdown 등록 + detached finalizer + boot-sweep). Codex·agy 공통 보상 채널로 재사용.
- **matcher 번역 확정**: agy 도구 어휘(`view_file`/`write_to_file`/`replace_file_content` 등)를 인터랙티브 스모크로 확정(현재 근사).

## 3. SessionEnd → MCP 수명주기 — ✅ 완료

**결정**: SessionEnd 를 Claude 포함 기반 로직에서 제거하고 **MCP 서버 shutdown 핸들러**로 이전한다(동일 동작 보장). 근거 — agy `Stop` 은 매 턴 발화라 SessionEnd 로 못 쓰고, Codex 는 훅 자체가 없다. 반면 **MCP 서버 프로세스 수명주기는 3-호스트 공통 "세션 종료" 신호**다(세션당 spawn/kill). 상세는 [sessionend-refactor.md](./sessionend-refactor.md).

- 각 플러그인 MCP 서버에 shutdown 핸들러(`process.on('SIGTERM')`/stdin 'close') → 현행 SessionEnd 로직 실행. git commit(maencof vault)은 best-effort + MCP-부팅 sweep 안전망, LLM recap 은 증분화.
- 컴파일러 지원 완료: SessionEnd **기본 fallback = `mcp-lifecycle`**(parseHooks) — 전 호스트 훅에서 미emit(Claude 포함), 손실 경고 없음. 런타임은 `@ogham/session-finalizer`(shutdown 등록 + detached finalizer + boot-sweep)가 소유.
- **런타임 이관 완료**: maencof·filid 이관, imbas 는 세션종료 작업이 없어 불요 — **전 플러그인에서 SessionEnd 훅 제거 완료.** 이 절은 보류 결정과 무관하게 유지된다(수용 범위).

## 4. Stage D 인프라 (플러그인 공통)

- [ ] 러너 어댑터(agy stdin 계약·once-guard·tool_name 역매핑) — **재개 시 첫 작업**.
- [x] MCP-부팅 sweep 런타임(SessionEnd 정리 보상): `@ogham/session-finalizer` 신설 + maencof·filid 이관 완료(imbas 불요).
- [ ] 빌드 파이프라인 `compile:plugin` 스텝(사용 가이드 §7) + `bridge` 뒤 삽입.
- [ ] 루트 마켓플레이스 emit: `.claude-plugin/marketplace.json`(→targets/claude) + `.agents/plugins/marketplace.json`(codex) + `.agents/plugins.json` declared(agy).
- [ ] Codex 에이전트 설치 스텝: `.codex-agents/*.toml` → `~/.codex/agents/` 또는 repo `.codex/agents/`(setup 스킬).
- [ ] Codex 보상 채널 emit: AGENTS.md + skill lazy-init 지시 삽입 — 설계만 존재(matrix §4.5), emitter 미구현.
- [ ] CI: clean-regen 게이트(함정 3 참조 — git-diff 방식) + `windows-latest` 매트릭스(훅/MCP stdio 왕복) + 단위 테스트 재도입([reproduction.md](./reproduction.md)).
- [ ] agy 인터랙티브 MCP 기동 스모크(헤드리스 `--print` 미기동 — 잔여 게이트).

## 5. 재배치 순서 (난이도 오름차순 — case-studies §0)

훅 수는 SessionEnd 제거(§3 완료) 반영 기준.

| #   | 플러그인     | 특이사항                                                                               |
| --- | ------------ | -------------------------------------------------------------------------------------- |
| 1   | prawf        | MCP·훅 없음, 순수 skills+agents. 가장 단순(agy 무변환, Codex agents 만)                |
| 2   | r-statistics | MCP+agents, 훅 없음. 외부 R 바이너리는 호스트 무관. **함정 2(shared/contract.R) 대상** |
| 3   | entrez       | MCP+agent 1, 훅 없음                                                                   |
| 4   | deilen       | MCP+skills, 훅·agent 없음. **손작성 정본 레퍼런스 존재**(재추출로 재현)                |
| 5   | atlassian    | MCP+agents 3, 훅 없음. 원격 API                                                        |
| 6   | maencof-lens | 훅 1(SessionStart)+agent 1. @ogham/maencof 공유 결합                                   |
| 7   | cennad       | 훅 2. **자기참조 순환**(codex/agy/claude 위임 — 자기 provider 제외 조정)               |
| 8   | imbas        | 훅 4(SubagentStart 포함)                                                               |
| 9   | maencof      | 훅 4(PostToolUse 포함)+skills 28+git write. SessionEnd 관심사는 §3 로 이전 완료        |
| 10  | filid        | 훅 4+agents 14+skills 19. `migrate.sh`(POSIX 전용 — Node 재작성 or 고지)               |

## 6. 기능 손실 고지 (재개 시 사용자 재확인 항목)

- Codex: 훅 전량 손실 → AGENTS.md/MCP-sweep 보상(강제력 없는 soft guard 포함). filid PreToolUse 구조 가드는 강제력 상실. **보류 결정의 1차 근거 — 재개 시에도 훅 보유 5종은 Codex 배포 제외.**
- agy: SessionEnd recap/commit 형(maencof)은 §3 이관으로 해소됨(MCP 수명주기 소유). SessionStart 는 once-guard 전까지 매 호출 재실행 낭비. SubagentStart 는 대응 이벤트 없음 — 드롭.
- cennad: 자기 호스트 위임 순환 → 호스트별 provider 제외.
