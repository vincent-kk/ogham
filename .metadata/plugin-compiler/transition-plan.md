# 최종 전환 계획 — Claude 정본 + Codex · agy 멀티호스트

> **작성 2026-07-15.** Stage 1 실측 게이트 **G1–G8 전부 종료** 후 확정한 실행 계획. 사실 근거는 [host-capability-matrix.md](./host-capability-matrix.md), 절차 정본은 [migration-playbook.md](./migration-playbook.md), 정본 런타임 수정은 [stage4-host-paths.md](./stage4-host-paths.md).
>
> 이 문서는 **순서대로 쭉 실행**하도록 쓰였다. 각 Phase 는 앞 Phase 에만 의존한다.

---

## 0. 실측이 바꾼 것 (요약)

계획 착수 전 가정 4개가 실측으로 **반증**됐다. 계획은 그 결과 위에 서 있다.

| 반증된 가정                                                     | 실제                                                                               |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| "Codex MCP 는 cwd 생략 시 플러그인 루트" (소스 확정이라 믿었음) | **세션 cwd 다.** MCP 보유 9개 플러그인 전체가 **무음 사망**하고 있었다 (수정 완료) |
| "도구명은 `mcp__<server>.<tool>`, 스코프 있음"                  | `mcp__<server>__<tool>`, **플러그인 스코프 없음** → 서버명 오버라이드가 필수였다   |
| "agy 는 `--print` 라서 MCP 미기동"                              | **위치** 때문이다. `agy plugin install` 이 넣는 곳에서는 인터랙티브도 안 뜬다      |
| "`~/.codex/rules` 가 filid 규칙의 Codex 타깃"                   | 그건 **커맨드 승인 allowlist** 다. 지침 채널은 **`AGENTS.md`** 뿐                  |

---

## 1. 호스트별 최종 판정

| 항목              | Claude  | Codex                                     | agy (1.1.2)                                    |
| ----------------- | ------- | ----------------------------------------- | ---------------------------------------------- |
| 마켓플레이스·설치 | 🟢 현행 | 🟢 `codex plugin marketplace add` → `add` | 🔴 **`agy plugin install` 로는 MCP 가 죽는다** |
| Skills            | 🟢      | 🟢 `<plugin>:<skill>` 주입                | 🟢                                             |
| Hooks             | 🟢      | 🟢 **전 계약 동작** (trust 승인 필요)     | 🔴 **0개 로드** (포맷 오독)                    |
| MCP 기동          | 🟢      | 🟢 (`cwd:"."` 수정 후)                    | 🟡 `.agents/plugins/` 에 둬야 뜬다             |
| MCP 경로 의미     | 🟢      | 🔴 **프로젝트 좌표 상실** (38 지점)       | 🔴 동일                                        |
| Agents            | 🟢      | 🔴 컴포넌트 없음                          | 🟡 수용은 됨 (스폰 의미론 미검증)              |
| 규칙 문서         | 🟢      | 🟡 `AGENTS.md` 로 분기 필요               | 🟡 미실측                                      |

**판정**: **Codex 는 1급 타깃**으로 간다. **agy 는 2급** — skills/agents 는 지금도 되지만, MCP 는 수동 배치가 필요하고 훅은 Stage 3 전까지 불가. agy 의 플러그인-MCP 위치 버그는 **우리 쪽에서 못 고친다**.

---

## 2. Phase A — 어댑터 정정 ✅ 완료 (`42d5d898`)

- [x] **A1. `.agents/plugins.json` emitter 제거** — declared 레이어는 3가지 형식 모두 로드 실패(matrix §4.4).
- [x] **A2. 루트 `plugins/<n>/plugin.json` emitter 추가** — `.codex-plugin/plugin.json` 과 **바이트 동일**(같은 빌더, 스펙으로 고정). agy 마커이자 Codex 가 실제로 읽는 경로.
- [x] **A3.** `package.json:files` 에 `plugin.json` 추가 · `inject-version.mjs` 가 매니페스트 2곳을 함께 동기화.
- [x] **A4. 검증** — 30 파일 결정적(`--check` unchanged) · typecheck clean · 스펙 101 통과 · **Claude 소비 파일 diff 0**.
- [x] **A5. Claude 무결손 실증** — `claude --plugin-dir` 디버그 로그가 루트 매니페스트 추가 전후 **동일**(플러그인 수·경고/에러 수 27→27). Claude 는 `.claude-plugin/plugin.json` 만 읽는다(공식 문서 + 실측).
- [x] **호스트 검증** — Codex: 도구 4개 노출·MCP 경고 0건. agy: `source: antigravity` 분류로 `mcp_config.json`(상대 args + `OGHAM_HOST`) 보존.

---

## 3. Phase B — 배선 ✅ 완료 (`42d5d898`)

- [x] **B1. CI paths 선행 수정** — `**.json` 배제를 풀고 **정본 입력**(`**/.mcp.json`·`**/hooks.json`·매니페스트·마켓플레이스)과 **생성물**(`**/plugin.json`·`**/mcp_config.json`·`.agents/**`)을 양쪽 다 트리거에 넣었다. paths 를 먼저 안 고치면 check 를 넣어도 무효였다.
- [x] **B2. `plugin:adapters:check` 를 CI 단계로 편입** — 어댑터 손편집 → exit 1, 재생성 → exit 0 로 실증.
- [x] **B3. README(EN/ko) 설치 절** — Codex·agy 절차와 **알려진 한계**(Codex 훅 trust 미승인 시 무음 스킵 · agy MCP 수동 배치) 명시.

---

## 4. Phase C — 정본 런타임 (**이 브랜치에서 이어간다**)

> 애초에 별도 체크아웃에서 진행할 계획이었으나, **경로 좌표 코드가 호스트에서 한 번도 돌지 않았다**는 사실 때문에 이 브랜치로 가져온다. 검증 하네스(호스트 PoC 절차·프로브)가 여기 있고, C4 도 같은 헬퍼를 건드린다.

- [x] **C1–C3. 경로 좌표 — 코드** (main `77825966`) — `@ogham/cross-platform` 에 `hostPaths`(`detectHost`·`pluginRoot`·`projectRoot`) 신설, A(7 지점)·B(31 지점) 반영. imbas 인자 폭증은 **`projectRootMemo`**(첫 호출이 준 루트를 세션에 기억)로 해소. 잔여 4개 `process.cwd()` 는 프로젝트 좌표가 아니므로 **의도적 잔류**.
- [x] **M1. main 머지 + `yarn plugin:adapters` 재생성** — 완료. 게이트가 설계대로 21 stale 을 잡았다.
- [x] **V1–V4. 경로 좌표 — 코드** ✅ **코드 완료 · 호스트 실측은 유예**. 상세는 [TODO.md](./TODO.md) - **V1**: `toAbsoluteRoot()` 가 `~` 를 전개한다 (`~user` 는 거부). 세 호스트 공통. 스키마 설명 문구는 `PROJECT_ROOT_ARG_DESCRIPTION` 정본 1곳으로 통합. - **V3**: `pluginRoot()` 의 agy 분기를 **cwd 추측이 아니라 자기탐색**(`locatePluginRoot()` — 매니페스트까지 상향 8단계)으로 닫았다. 미실측 가정에 기대지 않는다. r-statistics `contract.R` 이 이걸로 살아난다. - **V2·V4**: 모델 순응과 `run_r` 실행은 **실측 대상** — 코드 쪽 대비(안내 문구·계약 경로 스펙)는 끝났다.
- [x] **C4. 규칙 채널** ✅ **코드 완료** → **[stage4-rules-channel.md](./stage4-rules-channel.md)**
      `ruleDocsTarget()` 로 filid 가 Codex 에서 `AGENTS.md` 에 마커 구간으로 병합하고, maencof 도 `instructionsFile()` 로 대상을 잡는다. ⚠ **읽기 채널도 같이 고쳤다** — 훅엔 `OGHAM_HOST` 가 **없어** 호스트 분기가 불가능하므로 **모든 채널 합집합 판독**으로 풀었다.
- [ ] **M2. 호스트 실측** ⬜ **다음 작업** — Vincent 님 요청으로 한 번에 몰아서 한다. 항목·절차는 [TODO.md](./TODO.md) §"유예된 실측(M2)".

**완료 기준**: `OGHAM_HOST` 부재(=Claude)에서 전 플러그인 테스트가 현행과 **동일 통과** — ✅ 4267 초록. Codex 에서 `run_r` 이 `contract.R` 을 찾고, 프로젝트 대상 도구가 사용자 워크스페이스를 보며, 규칙이 `AGENTS.md` 로 실려 모델 프롬프트에 실제 주입된다 — **M2 에서 확인**.

---

## 5. Phase D · E — 심화 (선택)

> **상세 정본: [backlog-d-e.md](./backlog-d-e.md)** — 실측 사실·함정·이벤트 매핑표까지 담았다. 아래는 요약.

### Phase D — agy 심화 (선택 · 채택 시)

- [ ] **D1. agy 포맷 `hooks.json` emitter** (Stage 3) — named-group 형식 + agy 이벤트 매핑(`SessionStart`→`PreInvocation`+once-guard, `UserPromptSubmit`→`PreInvocation`, `PreToolUse`/`PostToolUse`→동명+matcher 번역, `SubagentStart`→드롭) + `libs/run.cjs` 의 camelCase stdin 정규화.
      ⚠ **선행 확인**: 루트 `hooks.json` 을 Codex 가 자동 발견해 오독하지 않는지(Codex 는 `hooks` 필드로 `hooks/hooks.json` 을 명시 선언하지만, 스펙상 "명시 선언은 기본 발견을 *보완*한다"). 오독하면 파일명을 바꾼다.
- [ ] **D2. agy 설치 스크립트** — `plugins/<n>/` → `~/.agents/plugins/<n>/` 복사/심링크. **`agy plugin install` 은 MCP 가 로드되지 않는 위치에 넣으므로 쓰면 안 된다**(matrix §4.4). 마켓플레이스 배포 사용자는 이 스크립트 없이는 MCP 를 못 쓴다 — agy CLI 가 고쳐질 때까지의 한계로 고지한다.

---

### Phase E — Codex 심화 (선택)

- [ ] **E1. 스킬 본문 도구명** (G6) — 본문의 Claude full-form(`mcp__plugin_deilen_tools__render_viewer`)은 Codex 실제 도구명(`mcp__deilen__render_viewer`)과 **불일치가 확정**됐다. 서술형 참조로 완화하거나 호스트별 안내를 `AGENTS.md` 로 보완.
- [ ] **E2. maencof 레코더 도구명 정규화** — Codex 도구명(`Bash`·`apply_patch`·`mcp__<server>__<tool>`)과 훅 내부 매칭 불일치.
- [ ] **E3. filid·imbas `Read` matcher** — Codex 에 `Read` 별칭이 없어 미발화(진단이 이미 warning 으로 노출 중). 읽기 추적 손실을 고지하거나 대체 신호 설계.
- [ ] **E4. `commandWindows`** (Windows) · **agents 컴포넌트 대안**(위원회 의존 스킬의 Codex 거동 정의).

---

## 7. 사용자 고지 문안 (README 정본)

| 호스트 | 설치                                                                                                                                    | 알려진 한계                                                                           |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Claude | `/plugin marketplace add vincent-kk/ogham` → `/plugin install <pkg>@ogham`                                                              | 없음 (정본)                                                                           |
| Codex  | `codex plugin marketplace add vincent-kk/ogham` → `codex plugin add <pkg>@ogham` → **TUI 첫 진입에서 훅 trust 승인** → 새 스레드        | subagent 위원회 미지원 · `Read` 추적 손실 · **훅 trust 전에는 훅이 무음으로 안 돈다** |
| agy    | `agy plugin install <pkg>@ogham` (skills·agents 만) — **MCP 를 쓰려면** 플러그인 디렉터리를 `~/.agents/plugins/<pkg>/` 로 복사해야 한다 | **훅 전면 미지원**(Stage 3 전까지) · MCP 는 수동 배치 필요                            |

**cennad 사용자 주의**: cennad 가 codex 로 위임할 때 대상 codex 세션의 훅은 **trust 승인 전까지 발화하지 않으며 아무 경고도 없다**. 자동화라면 `codex exec --dangerously-bypass-hook-trust`.

---

## 8. 순서 의존성

```
Phase A ✅ (어댑터 정정)  ──→  Phase B ✅ (CI·README)
                                    │
                                    ▼
              M1 ✅ (main 머지 + 어댑터 재생성)
                                    │
                                    ▼
              V1–V4 ✅ + C4 ✅ (코드)               ← 한 번에 감. 아래 각주 참조
                                    │
                                    ▼
              M2 (호스트 실측)  ⬜ ← 다음. 코드보다 먼저.
                                    │
                                    ▼
              main 머지 → GitHub 경유 설치 재확인   ──→  Phase D/E (선택 심화)
```

- **원래 V → C4 순서였던 이유**("헬퍼가 실제로 도는 걸 본 뒤에 채널 분기를 얹어야 agy 분기를 두 번 손대지 않는다")는 **해소됐다**: agy 분기를 실측 의존 가정(cwd)이 아니라 **자기탐색**으로 닫았으므로, 실측 결과가 그 분기를 되돌릴 일이 없다. 그래서 둘을 함께 진행했다.
- **M2 는 코드보다 먼저** — 남은 미결(모델 순응·agy 지침 파일)은 실측만이 답할 수 있고, 그 답이 설계를 바꿀 수 있다.
- **C4 없이 Codex 를 "정식 지원" 이라 선언하면 안 된다** — 규칙·지침 문서가 아무도 안 읽는 경로에 쌓인다. (코드는 들어갔고, 실제 주입은 M2-5 에서 확인한다.)

---

## 9. 지금 상태

- **완료**: 어댑터 체제 구축 · Codex `cwd` 블로커 수정 · 게이트 G1–G8 전부 종료 · **V1–V4 · C4 코드 반영**(틸데 전개 · 자기탐색 플러그인 루트 · `AGENTS.md` 규칙/지침 채널 · 훅 합집합 읽기) — 전체 4267 초록, 어댑터 30 unchanged.
- **다음**: **호스트 실측(M2)** — 유예해 둔 것을 한 번에. 코드를 더 쓰기 전에 한다.
- **PoC 잔여**: codex 에 마켓플레이스 `ogham` + `deilen`·`r-statistics`·`maencof-lens` 설치, `ogham_mk2` 신뢰 디렉터리, maencof-lens 훅 trust 등록. 정리: `codex plugin remove <n>@ogham` + `codex plugin marketplace remove ogham`. agy 는 이미 정리됨.
