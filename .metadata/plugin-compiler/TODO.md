# TODO — 기존 플러그인 재배치 (마이그레이션 플레이북)

> 현재 각 플러그인은 `skills/`·`agents/`·`hooks/` 를 **플러그인 루트**에 두고 Claude 전용으로 설치된다. 목표는 이를 **정본 `definitions/`** 로 재배치하고, 컴파일러가 `targets/{claude,codex,agy}/` 를 생성해 3-호스트로 배포하는 것. 도구·스펙은 완성(커밋됨) — 이 문서는 남은 **재배치 로직 + 런타임/인프라 작업**.

## 0. 현재 상태 vs 목표

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
6. **빌드 배선**: `package.json` 에 `compile:plugin` 스텝 추가(사용 가이드 §7).

## 2. Hook 재배선 (핵심 — MCP 서버는 그대로, 훅은 배선 필요)

질문대로: **MCP 서버는 그대로 쓴다**(번들 `.mcp.json` → 호스트별 mcp config 로 파일명·경로전략만 변환, 런타임 무수정). 그러나 **훅 스크립트는 호스트별 배선/재설계가 필요**하다.

| 훅 경로      | Claude                    | Codex                             | agy                                          |
| ------------ | ------------------------- | --------------------------------- | -------------------------------------------- |
| 생성 여부    | `hooks/hooks.json` 그대로 | **생성 안 함** (플러그인 훅 불가) | `hooks.json` named-group (이벤트 매핑)       |
| 런타임 계약  | snake_case stdin (현행)   | —                                 | **camelCase stdin** → 러너 어댑터 필요       |
| SessionStart | 그대로                    | 드롭 → AGENTS.md/lazy-init 보상   | PreInvocation + **once-guard 필요**          |
| SessionEnd   | 그대로(또는 §3 으로 이전) | 드롭 → MCP-부팅 sweep 보상        | 드롭 → MCP-부팅 sweep 보상                   |
| PreToolUse   | 그대로                    | 드롭 → AGENTS.md 서술             | matcher 번역(Claude 도구명→agy 도구명, 근사) |

**남은 런타임 작업(Stage D)**:

- **러너 어댑터** (`libs/run.cjs` 확장 또는 `libs/run-agy.cjs`): agy camelCase stdin ↔ Claude 계약 정규화 + tool_name 역매핑(maencof PostToolUse 가 full-form 매칭). 이걸 넣어야 agy 훅이 기존 `bridge/*.mjs` 를 무수정 재사용한다.
- **once-guard**: SessionStart→PreInvocation 이 매 호출 재실행되지 않도록 "마지막 실행 conversationId 기록 + 불일치 시 실행"(락파일 아님 — 좀비 방지). agy 전용.
- **MCP-부팅 sweep**: SessionEnd 정리성 작업을 다음 세션 MCP 서버 기동 시 수행(`cacheManager.sweepStaleSessions(exceptId)` 류). Codex·agy 공통 보상.
- **matcher 번역 확정**: agy 도구 어휘(`view_file`/`write_to_file`/`replace_file_content` 등)를 인터랙티브 스모크로 확정(현재 근사).

## 3. SessionEnd → MCP 수명주기 (별도, 각 플러그인 런타임)

**결정**: SessionEnd 를 Claude 포함 기반 로직에서 제거하고 **MCP 서버 shutdown 핸들러**로 이전한다(동일 동작 보장). 근거 — agy `Stop` 은 매 턴 발화라 SessionEnd 로 못 쓰고, Codex 는 훅 자체가 없다. 반면 **MCP 서버 프로세스 수명주기는 3-호스트 공통 "세션 종료" 신호**다(세션당 spawn/kill).

- 각 플러그인 MCP 서버에 shutdown 핸들러 추가: `process.on('SIGTERM')`/stdin 'close' → 현행 SessionEnd 로직 실행.
  - 동기/빠른 정리(filid 캐시·imbas) → 신뢰.
  - git commit(maencof vault) → best-effort(호스트 grace 후 SIGKILL 가능) + MCP-부팅 sweep 안전망.
  - LLM recap(maencof) → shutdown 시 불가 → **증분화**(세션 중 누적) 또는 Claude 한정 손실.
- 컴파일러 지원(완료): `plugin.yaml: hooks: { SessionEnd: mcp-lifecycle }` 선언 시 SessionEnd 를 **전 호스트 훅에서 미emit**(Claude 포함), 손실 경고 없음. 각 플러그인이 서버 이전을 마치면 이 오버라이드를 정본에 추가(또는 hooks.json 에서 SessionEnd 자체 제거).
- 이 작업은 **이 PR 무관** — 플러그인별 런타임 변경으로 별도 진행.

## 4. Stage D 인프라 (플러그인 공통)

- [ ] 러너 어댑터(agy stdin 계약·once-guard·tool_name 역매핑).
- [ ] MCP-부팅 sweep 런타임(SessionEnd 정리 보상).
- [ ] 빌드 파이프라인 `compile:plugin` 스텝(사용 가이드 §7) + `bridge` 뒤 삽입.
- [ ] 루트 마켓플레이스 emit: `.claude-plugin/marketplace.json`(→targets/claude) + `.agents/plugins/marketplace.json`(codex) + `.agents/plugins.json` declared(agy).
- [ ] Codex 에이전트 설치 스텝: `.codex-agents/*.toml` → `~/.codex/agents/` 또는 repo `.codex/agents/`(setup 스킬).
- [ ] CI: clean-regen 게이트(`compile --check`) + `windows-latest` 매트릭스(훅/MCP stdio 왕복) + 단위 테스트 재도입([reproduction.md](./reproduction.md)).
- [ ] agy 인터랙티브 MCP 기동 스모크(헤드리스 `--print` 미기동 — 잔여 게이트).

## 5. 재배치 순서 (난이도 오름차순 — case-studies §0)

| #   | 플러그인     | 특이사항                                                                                |
| --- | ------------ | --------------------------------------------------------------------------------------- |
| 1   | prawf        | MCP·훅 없음, 순수 skills+agents. 가장 단순(agy 무변환, Codex agents 만)                 |
| 2   | r-statistics | MCP+agents, 훅 없음. 외부 R 바이너리는 호스트 무관                                      |
| 3   | entrez       | MCP+agent 1, 훅 없음                                                                    |
| 4   | deilen       | MCP+skills, 훅·agent 없음. **손작성 정본 레퍼런스 존재**(재추출로 재현)                 |
| 5   | atlassian    | MCP+agents 3, 훅 없음. 원격 API                                                         |
| 6   | maencof-lens | 훅 1(SessionStart)+agent 1. @ogham/maencof 공유 결합                                    |
| 7   | cennad       | 훅 2. **자기참조 순환**(codex/agy/claude 위임 — 자기 provider 제외 조정)                |
| 8   | imbas        | 훅 5(SubagentStart 포함)                                                                |
| 9   | maencof      | 훅 5(PostToolUse 포함)+skills 28+git write. SessionEnd=vault commit/recap(§3 핵심 대상) |
| 10  | filid        | 훅 5+agents 14+skills 19. `migrate.sh`(POSIX 전용 — Node 재작성 or 고지)                |

## 6. 기능 손실 고지 (사용자 확인 필요 항목)

- Codex: 훅 전량 손실 → AGENTS.md/MCP-sweep 보상(강제력 없는 soft guard 포함). filid PreToolUse 구조 가드는 강제력 상실.
- agy: SessionEnd recap/commit 형(maencof) 손실(정리성만 MCP-sweep 보상). SessionStart 는 once-guard 전까지 매 호출 재실행 낭비.
- cennad: 자기 호스트 위임 순환 → 호스트별 provider 제외.
