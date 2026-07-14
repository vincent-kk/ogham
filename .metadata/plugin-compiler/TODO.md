# TODO — in-place 멀티호스트: 다음 세션 인수인계

> **결정(2026-07-14, Vincent)**: 어댑터 체제 구축까지 완료하고 **실측(PoC)부터는 지금 진행하지 않는다**. 이 문서가 다른 세션의 재개 시작점이다. 절차 정본은 [migration-playbook.md](./migration-playbook.md), 사실 정본은 [host-capability-matrix.md](./host-capability-matrix.md), 도구 계약은 [`tools/plugin-compiler/DETAIL.md`](../../tools/plugin-compiler/DETAIL.md).

## 완료 상태 (재개 시 전제 — 검증 불요)

브랜치 `feature/issue-78-1`, 커밋 6개:

- `a3a74d78` 문서 재편(in-place 채택) · `f3ba81f2` 도구 재작성 · `2d87f58d` 배선(스크립트·inject-version·files) · `3abb3bbe` 어댑터 21파일 · `23d251e9` CLI 분리+스펙 97개 · `e8a0d632` 문서 갱신.
- 어댑터 4종 생성·커밋됨: 플러그인별 `.codex-plugin/plugin.json`(×10)·`mcp_config.json`(×9), 루트 `.agents/plugins/marketplace.json`·`.agents/plugins.json`.
- 게이트 확인: `yarn plugin:adapters:check` 통과(21 unchanged — warning 은 filid·imbas `codex-read-matcher` 2건으로, DETAIL.md 의 Acceptance Criteria 가 예상한 값), 루트 `yarn typecheck`·`yarn test:run` 에 도구 편입 완료.
- **Claude 는 현행 그대로 동작(무수정). Codex/agy 는 설치 가능하나 전부 미실측.**

## 재개 작업 (순서대로)

### 1. Stage 1 — 실측 게이트 닫기 (G1–G8, playbook §3 이 정의 정본)

푸시 없이 로컬 경로로 가능. **등록 경로는 반드시 어댑터가 생성된 체크아웃**이어야 한다 (아래 "재개 시 주의" 의 이중 체크아웃 함정):

```bash
# 선행 조건 — 0 이 나오면 잘못된 체크아웃이다
find plugins -maxdepth 3 -path '*/.codex-plugin/plugin.json' | wc -l   # → 10

codex plugin marketplace add /Users/Vincent/Workspace/ogham_mk2   # 마켓플레이스명 = ogham
codex plugin add r-statistics@ogham && codex plugin add deilen@ogham
codex   # TUI 에서 도구 목록·호출 확인
```

- [x] **G1** ✅ 닫힘 — 도구명 `mcp__<server>__<tool>`(더블 언더스코어), **플러그인 스코프 없음** ⇒ 서버명 오버라이드는 필수. **블로커 발견·수정**: `cwd` 누락 시 MCP 9종 전체 무음 사망 → emitter 가 `"cwd": "."` 방출 (playbook §3.1)
- [x] **G7** ✅ 닫힘 — **제약 확정**. MCP 프로세스 env 는 `OGHAM_HOST` 뿐이고 Codex 는 세션 cwd 를 안 준다. cwd=플러그인 루트 고정이라 **deilen `preview` 상대 경로는 Codex 에서 오해석**. 대응 미결정 → Stage 4
- [x] **G6** ✅ 닫힘 — 스킬은 `<plugin>:<skill>` 로 정상 주입(Claude 규약과 동일). 단 본문 full-form(`mcp__plugin_deilen_tools__…`)과 실제 도구명(`mcp__deilen__…`) **불일치 확정** → 완화는 Stage 5
- [x] **G2** ✅ 닫힘 — 신뢰된 훅은 헤드리스 `codex exec` 에서 **발화**(ponytail 실측), 미신뢰 훅은 **조용히 스킵**(exit 0·경고 없음). ⇒ cennad codex 위임 경로는 trust 전까지 훅 무동작이고 **고지가 없다**. 우회: `--dangerously-bypass-hook-trust`
- [x] **G3** ✅ 닫힘 — `plugin add` 는 enabled 만; 첫 TUI 진입에서 `Hooks need review / 1 hook is new or changed` 게이트. `trusted_hash` 로 고정되며 **"changed"** 가 재신뢰 트리거
- [x] **G2 잔여** ✅ 닫힘 — maencof-lens 훅 trust 후 헤드리스 exec 에서 **발화하고 모델이 주입 문구를 그대로 인용**했다. `${CLAUDE_PLUGIN_ROOT}` 쉘 전개 · `libs/run.cjs` · Claude 포맷 `hooks.json` 공유 · `additionalContext` 주입 **전부 동작**. **훅은 세션 cwd 를 받는다** → MCP 와 달리 Stage 4 경로 문제 대상 아님
- [ ] **G5** agy 축: `agy plugin install` 시 `hooks/hooks.json`(Claude 포맷) 오독 여부 — 오독 시 훅 파일 개명(플레이북 대응책)
- [ ] **G4** agy 인터랙티브에서 `mcp_config.json` 상대 args 기동 (실패 시 emitter 를 절대경로 주입으로 교체) — **agy 축(G4·G5)은 1.1.2 로 재실측**: matrix 의 agy 사실은 1.1.1(2026-07-11) 기준이라 승계 금지
- [ ] **G8** Codex 규칙 채널(`~/.codex/rules` 로드 규약·AGENTS.md 등가성) — Stage 4 의 전제
- [x] 1차 결과 기록 완료 — playbook §3.1 · matrix §3·§4.1·§6·§7·§8 · compiler-architecture §3.1 · DETAIL.md 동기화 (2026-07-15)

**남은 것**: G2·G3(훅 — maencof-lens 설치 필요), G5(agy 훅 오독), G4(agy MCP — **1.1.2 로 재실측**), G8(Codex 규칙 채널). 마지막으로 cennad 설치로 codex 위임 경로(자기참조) 점검.

**현재 PoC 상태**: codex 에 마켓플레이스 `ogham` + `deilen`·`r-statistics` 설치됨. `~/Workspace/ogham_mk2` 는 codex 신뢰 디렉터리로 등록됨. 정리 절차는 아래.

### 2. Stage 2 — 배선 (게이트 통과 후)

- [ ] CI 에 `yarn plugin:adapters:check` 편입 + `ci.yml` paths 에 `.codex-plugin/**`·`**/mcp_config.json`·`.agents/**` 추가 — **paths 추가가 선행 조건**. 현행 `ci.yml` 은 `**.json` 을 명시 배제하고(주석: "config/manifest-only … skip the matrix") `**.ts`~`**.cjs` 만 트리거하므로, 어댑터(전부 `.json`)만 손편집·desync 된 커밋은 **CI 자체가 돌지 않아** check 를 job 에 넣어도 무효다. paths 추가와 job 편입은 한 쌍.
- [ ] 사용자용 README(EN/ko)에 Codex·agy 설치 절 추가 — 문구 정본은 playbook §1 표 (`/hooks` trust 승인 단계 포함)
- [ ] main 머지/푸시 후 GitHub 경유 설치(`codex plugin marketplace add vincent-kk/ogham`) 재확인

### 3. Stage 4 — 호스트 경로 해석 + 결합 런타임 분기

> **설계 정본: [stage4-host-paths.md](./stage4-host-paths.md)** — 왜 깨지는지·무엇을 고치는지·플러그인별 지점·근거.
> **정본(플러그인 런타임) 수정이므로 `~/Workspace/ogham` 체크아웃에서 진행한다.** 이 브랜치(어댑터·도구)와 분리.

**2026-07-15 실측으로 범위 확대**: `cwd:"."` 로 Codex MCP 서버는 뜨지만, **`process.cwd()` 를 프로젝트로 가정하는 8 플러그인 / 31 지점이 전부 플러그인 루트를 본다** — imbas(15) 사실상 전 기능, cennad 위임 spawn, r-statistics allow-root, deilen 프로젝트 격리. 추가로 `CLAUDE_PLUGIN_ROOT` 의존 6 플러그인 / 7 지점(r-statistics `run_r` 파손, filid 규칙 배포 무음 skip). **이 Stage 없이는 Codex 에서 MCP 도구가 의미상 어긋난 채 동작한다.**

어댑터가 주입하는 env 는 준비됨(MCP: `OGHAM_HOST`=codex/agy, 부재=claude; 훅: `PLUGIN_DATA` 유무=codex). 런타임 쪽 미구현:

- [ ] `@ogham/cross-platform` 에 `./host-paths` 추가 — `detectHost()`·`pluginRoot()`·`projectRoot()` (8/10 플러그인이 이미 이 패키지 의존)
- [ ] **A**(플러그인 루트, 7 지점) 기계적 교체 — 모델 개입·스킬 변경 없음, Claude 불변. r-statistics `contract.R` 이 살아난다
- [ ] **B**(프로젝트 루트, 31 지점) — 도구 스키마에 선택 인자 `projectRoot?` 추가 + 스킬 안내. imbas 는 인자 폭증을 피할 전략 결정 필요

- [ ] 공용 호스트 감지 헬퍼 신설 위치 결정(shared/\* 또는 플러그인별) 후 분기 적용:
  - [ ] maencof `claudeMdMerger`(`constants/claudeMd.ts` 의 `CLAUDE.md`) → Codex 에서 `AGENTS.md`
  - [ ] filid `rule_docs_sync`/`syncRuleDocs`(`.claude/rules/*.md`) → G8 실측 결과의 채널 + 훅 주입 문구의 경로 언급 분기
- [ ] 신규 플러그인 규칙: 호스트 고정 경로(`CLAUDE.md`·`.claude/**`) 쓰기는 처음부터 이 헬퍼 경유

### 4. Stage 3(agy 러너 어댑터 — agy 실사용 채택 시) · Stage 5(Codex 심화)

playbook §4 참조: agy camelCase stdin 정규화·once-guard·named-group emitter / maencof 레코더 도구명 정규화·filid Read 보완(read 계열 도구명 실측 후 matcher 확장)·agents 대안·`commandWindows`.

## 재개 시 주의

- **이중 체크아웃 함정**: 로컬에 `~/Workspace/ogham`(main · 어댑터 0개)과 `~/Workspace/ogham_mk2`(이 브랜치 · 어댑터 21개)가 공존한다. 전자를 마켓플레이스로 등록하면 Codex 가 `.claude-plugin` fallback 으로 떨어져 변수 args 가 든 `.mcp.json` 을 읽는다 — **어댑터를 전혀 타지 않는 가짜 PoC** 가 되어 G1·G7 실패 원인을 오독한다(matrix §5.1 탐색 순서).
- 어댑터 4종은 **손편집 금지** — 정본 수정 후 `yarn plugin:adapters`. 릴리즈 버전은 `version:sync` 가 `.codex-plugin` 까지 동기화.
- Codex 는 훅 파일 해시로 trust 를 고정(config.toml `[hooks.state]`) — 훅 파일이 바뀌면 `/hooks` 재승인 필요할 수 있음(G3 에서 확정). 로컬엔 ponytail 훅이 이미 trust 등록돼 있어 **G3 는 ogham 설치 없이 ponytail 만으로 선실측 가능**.
- PoC 정리: `codex plugin remove <n>@ogham` + `codex plugin marketplace remove ogham` (`~/.codex/plugins/cache`·`data` 잔재 확인).
