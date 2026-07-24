# Plugin Compiler — Claude 정본 + in-place 호스트 어댑터

> **Status: 채택·구현 완료 — in-place 어댑터 체제 (2026-07-14 전환 · 2026-07-21 3-호스트 어댑터 완성).** Claude 산출물이 정본이자 그대로 Claude 배포물이고, Codex·Antigravity 호환은 생성되는 어댑터 파일(경로 7종 / 322 파일)이 담당한다. **착수 가능한 절차는 전부 완료** — 남은 것은 외부 차단 항목뿐(머지 후 라이브 게이트 · agy 업스트림 · Codex 플랫폼 한계, 아래 §현재 상태·남은 작업). 절차는 [migration-playbook.md](./migration-playbook.md), 도구는 [`tools/plugin-compiler`](../../tools/plugin-compiler/).
> 근거 이슈: [#78](https://github.com/vincent-kk/ogham/issues/78). 경위: 2026-07-11 실측(codex 0.144.1 — 플러그인 훅 불가)으로 `definitions/`→`targets/` 재배치 설계 후 **2026-07-12 보류**, 2026-07-14 재실측(codex 0.144.4 — 훅 지원 확정, ponytail 실증)으로 **in-place 어댑터로 전환·재개**. 구 재배치 설계·도구는 커밋 `6378169a` 이력 참조.

## 한 줄 요약

ogham 플러그인의 **Claude 산출물을 무수정 정본**으로 두고, `tools/plugin-compiler` 가 Codex(`.codex-plugin/`)·Antigravity(`mcp_config.json`·`hooks.json`)·루트 마켓플레이스(`.agents/*`) 어댑터 파일을 **결정적으로 생성**해 한 저장소가 3-호스트에 설치되게 한다.

## 문제 정의

`plugins/*` 는 Claude Code 전용으로 작성됐다. 실측 결과 Codex 는 Claude 플러그인 형식(매니페스트 fallback·hooks 포맷·skills·마켓플레이스 fallback)을 거의 그대로 소비하고, agy 도 skills/agents/MCP 를 무변환 수용한다. 남는 실차이 — Codex MCP args 변수 미전개·서버명 스코프·`subagent_type` 부재, agy MCP 파일명·훅 어휘 — 는 **파일 몇 개를 옆에 두는 것**으로 흡수된다. 호스트별 포크도, 배포 트리 분리도 불필요하다.

## 4 대 요구사항 (설계 제약)

1. **Claude Code 무결손** — 도구가 Claude 소비 파일을 일절 쓰지 않는다(생성 대상은 어댑터 전용 경로뿐). 무결손이 게이트가 아니라 **구조로 보장**된다.
2. **신규/수정도 멀티 호스트** — Claude 산출물을 평소처럼 수정하고 `yarn plugin:adapters` 로 어댑터를 재생성하면 전 호스트가 따라온다.
3. **결정적 생성** — 동일 정본 → 동일 어댑터(바이트). `--check` 가 CI clean-regen 게이트.
4. **Windows / POSIX** — 훅/서버 진입은 `node <script>` 직접 호출 유지. Codex Windows 는 `commandWindows` 병기 여지(후속).

## 핵심 결론 (실측 근거: [host-capability-matrix.md](./host-capability-matrix.md))

1. **Codex 0.144.4+ 는 플러그인 훅을 정식 지원**한다 — Claude hooks.json 포맷·이벤트 표기·stdin/stdout 계약·exit 2 차단·matcher 의미론까지 호환 구현(소스 검증). `hooks/hooks.json` 한 파일을 Claude·Codex 가 공유한다(ponytail 패턴).
2. **Codex 는 `.claude-plugin/plugin.json`·marketplace.json 을 fallback 으로 읽는다** — 어댑터가 없어도 발견은 되나, `.codex-plugin/plugin.json` 을 두면 MCP 인라인 선언이 Claude 전용 `.mcp.json` 을 차폐한다(유일한 실질 비호환 지점의 단일 차단점).
3. **잔여 격차는 국소적이고 전부 어댑터로 흡수됐다**: Codex 는 선언적 agents 컴포넌트 부재(→ 컴파일러 **스킬 변이** self-load 스폰으로 이식)·`Read` matcher 별칭 부재(→ **Codex 전용 read-matcher 훅**), agy 는 훅 어휘 상이(→ **agy named-group emitter + 러너**). 기능 손실 매트릭스는 matrix §7.
4. 실측 게이트 G1–G8 은 [migration-playbook.md](./migration-playbook.md) 가 소유한다 — **전부 종료**.

## 현재 상태 · 남은 작업

> TODO·transition-plan·backlog·stage4·c4-3 원장의 잔존 내용 흡수 (2026-07-21). 실측 로그 정본: [m2](./m2-measurement-log.md)·[stage5](./stage5-measurement-log.md)·[stage6](./stage6-codex-multiagent.md).

**완료 (착수 가능 절차 전부):**

- 실측 게이트 **G1–G8 전부 종료** (결과 정본: 플레이북 §3).
- 어댑터 생성기 완성 — 경로 7종 / **322 파일**, `plugin:adapters:check` **결정적(멱등)**.
- 경로 좌표(V1–V4)·규칙 채널(C4 = `AGENTS.md` 병합)·상태 디렉터리 호스트 인지(C4-3) 코드 반영(main).
- **훅 컨텍스트 상태 leak 봉합** (2026-07-21): C4-3 이 "구조적 한계"로 남겼던 **훅이 쓰는 상태의 `~/.claude` 누수**를 닫았다 — Codex 는 훅 프로세스에 `PLUGIN_DATA` 를 주입(소스 확정 · ponytail 실증)하므로 `stateRoot()` 가 이를 읽어 `~/.codex` 로 라우팅하고, 우회하던 `errorLog`·imbas setup 을 `pluginCache` 경유로 정정. fail-first 테스트 추가, 전체 4465 통과. (MCP 는 종전대로 `OGHAM_HOST` 로 감지.)
- Codex 파일도구 매칭(`apply_patch` 파싱 → Write/Edit)·agy 게이팅 훅(D1b, 라이브 검증)·Codex 전용 read-matcher 훅.
- **Codex 스킬 변이**(`buildCodexSkills`) — filid·entrez·r-statistics·imbas 의 `subagent_type` 스폰을 self-load(`_shared/personas/<id>.md` 채택)로 재작성해 `.codex-plugin/skills/` 방출. prawf 는 이미 self-load(무변환). **Claude `skills/` 바이트 불변.**
- 로컬 게이트 통과 확인: `yarn typecheck` 클린 · `plugin:adapters:check` **322 결정적**. PR **#89** 는 직전 실측 시점 CI 전부 초록(macOS·Ubuntu·Windows ×Node20/22)·MERGEABLE — **머지는 Vincent 이 프로덕션 판단 시점에 직접** (최신 로컬 커밋 `f4437a64` 미푸시).

**남은 작업 (전부 외부 차단 — 우리 코드로 완료 불가):**

- **머지 후 라이브 게이트**: main 머지 후 마켓플레이스 실설치로 Claude 무영향 재확인. Codex 축은 2026-07-22 에 **상태 경로 E2E 만 라이브 종료**(codex-cli 0.145.0 — 실설치 + `codex exec` 로 훅·MCP 양 채널이 `~/.codex/plugins/<pkg>` 로 수렴, `~/.claude` 누수 0. 상세: [TODO.md](./TODO.md) §Codex 라이브 E2E). 나머지 도구노출·훅 trust UX 는 여전히 미확인.
- **agy 업스트림 대기**: (F4) agy 1.1.2 가 PreInvocation `injectSteps` 를 렌더하지 않아 컨텍스트 주입 훅 무가치 — 어댑터·러너는 준비됨, agy 가 렌더하면 emit 만 추가. (L2) `agy plugin install` 이 MCP 안 뜨는 위치(`~/.gemini/config/plugins/`)에 설치 → `~/.agents/plugins/<pkg>/` 수동 복사(README 안내). 둘 다 agy CLI 수정 전까지 우리 쪽 해결 불가.
- **Codex 플랫폼 한계(고지)**: 셸 read 추적 불완전(복합 파이프/grep — `codex-read-matcher` 린트가 표면화), 스킬 본문 full-form 도구명 불일치(E1 — `AGENTS.md`/서술형 완화 여지). 모델의 Bash 파일편집 우회는 3-호스트 공통 guardrail 한계.
- **훅/MCP 상태 경로 호스트 정합성 심화 검토** — 1차 봉합(위)에 더해 2026-07-22 에 ① Claude 훅 env **직접 실측 종료**(`CLAUDE_` 접두만 주입 ⇒ un-prefixed `PLUGIN_DATA` = Codex 판별자 안전 확정)와 ② **호스트 레지스트리 분리**(`hostRegistry` — 호스트 지식 단일 진실원, `paths` 에서 호스트 리터럴 제거, agy 가 명시적 행으로)를 완료. ③ **정식 per-plugin data dir 은 쓰지 않기로 종료**(원래부터 의도된 설계 — 그 경로는 `<plugin>-<marketplace>` 로 install-source 마다 갈려 재설치 시 자격증명이 유실되고, Codex 는 MCP 에 값을 안 줘 채널이 분리된다. 근거는 `paths/INTENT.md`) ④ 힌트 문자열이 `errorLogPath(pkg)` 보간으로 전환 ⑤ 상태경로 **전수 감사 우회 0건** ⑥ **agy 훅 env 실측**(1.1.5 — 추가 변수는 `ANTIGRAVITY_CONVERSATION_ID` 하나, 상태 채널 없음). **이 이슈는 전 항목 종료** — 기록 정본: [TODO.md](./TODO.md).

**운영 함정 (재개·머지 시):**

- **이중 체크아웃**: `~/Workspace/ogham`(main) · `~/Workspace/ogham_mk2`(이 브랜치). 마켓플레이스 등록은 **어댑터가 생성된 체크아웃**에서 — 아니면 Codex 가 `.claude-plugin` fallback 으로 떨어져 어댑터를 안 타는 가짜 PoC. 등록 직전 `find plugins -maxdepth 3 -path '*/.codex-plugin/plugin.json' | wc -l` = 10 확인.
- **plugin-compiler 는 이 브랜치가 정본**: main 은 리팩터 이전 `emit/ir/profiles/verify` 구조, 이 브랜치는 `adapters/pipeline` 생성기. 머지 시 main 의 emit/ir 를 이 브랜치 `adapters/` 로 **대체**(단순 fast-forward 아님).
- **Codex 프로브 습관**: `codex exec` 는 항상 `< /dev/null -c model_reasoning_effort="low"` — 위치 인자 + stdin 미지정이면 무한 블록. 테스트 설치는 쓰고 나면 `~/.codex`·`~/.agents` 원복.

## 문서 목차

| 문서                                                       | 내용                                                                                            |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [host-capability-matrix.md](./host-capability-matrix.md)   | 3-호스트 능력 매핑 (**사실 정본**) — Codex 훅 계약·MCP 전략·마켓플레이스 fallback·손실 매트릭스 |
| [compiler-architecture.md](./compiler-architecture.md)     | in-place 어댑터 아키텍처 — 파일 지형·생성 규칙·도구 구조·검증                                   |
| [migration-playbook.md](./migration-playbook.md)           | 적용 절차 — 플러그인별 스텝·실측 게이트 G1–G8·설치 채널·알려진 격차                             |
| [sessionend-refactor.md](./sessionend-refactor.md)         | ADR — SessionEnd → MCP 수명주기 이관(완료·유지, 호스트 이벤트 채널 의존 제거)                   |
| [m2-measurement-log.md](./m2-measurement-log.md)           | 실측 로그 — M2 호스트 실측(V1–V4·C4 근거)                                                       |
| [stage5-measurement-log.md](./stage5-measurement-log.md)   | 실측 로그 — Stage 5(Codex 파일도구·agy 게이팅·emitter 배선)                                     |
| [stage6-codex-multiagent.md](./stage6-codex-multiagent.md) | 실측 로그 — Codex 네이티브 multi_agent 위원회 이식 검증(스킬 변이 근거)                         |

사용법(CLI)은 [`tools/plugin-compiler/DETAIL.md`](../../tools/plugin-compiler/DETAIL.md) 가 소유한다. 구 세션-복원 TODO·전환 계획(transition-plan)·경로/규칙 의뢰서(stage4-\*)·백로그(backlog-d-e)·C4-3 설계서는 작업 완료로 이 README §현재 상태·남은 작업 에 흡수·은퇴했다(상세 이력은 git). 현행 [TODO.md](./TODO.md) 는 그 덤프가 아니라 **훅/MCP 상태 경로 심화 검토 전용** 이슈 추적기로 신규 작성됐다(다음 세션). 구 체제 문서(ir-schema·case-studies·implementation-plan·reproduction·usage)는 재배치 설계와 함께 은퇴 — git 이력(`6378169a`) 참조.

## 용어

- **정본**: 각 플러그인의 현행 Claude 산출물(`.claude-plugin/`·`.mcp.json`·`skills/`·`agents/`·`hooks/`·`bridge/`·`libs/`). 사람이 수정하는 유일한 층.
- **어댑터**: 정본에서 생성되는 호스트 호환 파일 — **경로 7종 / 322 파일**. 플러그인별 `plugin.json`(루트 매니페스트 — agy 마커이자 Codex 가 실제로 읽는 경로) · `.codex-plugin/plugin.json`(위와 바이트 동일) · `mcp_config.json`(agy MCP, 9개) · `hooks.json`(agy 훅, filid·imbas·maencof) · `.codex-plugin/hooks.json`(Codex read-matcher 훅, filid·imbas) · `.codex-plugin/skills/` 트리(Codex 스킬 변이, entrez·filid·imbas·r-statistics) · 루트 `.agents/plugins/marketplace.json`. 손편집 금지 — 정본 수정 후 `yarn plugin:adapters`. (`.agents/plugins.json` agy declared 는 **폐기** — 로드되지 않았다.)
- **게이트 (G1–G8)**: 실사용 전 실측으로 닫아야 했던 미확정 항목. **전부 종료** — 플레이북 §3 이 결과 정본.
- **러너 어댑터**: agy 훅 stdin/응답 계약을 Claude 계약으로 정규화하는 런타임 층(`@ogham/cross-platform/agy-runner` → `bridge/run-agy.mjs` 번들). 게이팅 훅(PreToolUse deny)은 라이브 검증 완료, 컨텍스트 주입(PreInvocation)은 agy `injectSteps` 렌더 대기.
