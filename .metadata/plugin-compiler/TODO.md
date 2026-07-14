# TODO — in-place 멀티호스트: 세션 복원 지점

> **여기부터 읽으면 된다.** 2026-07-15 기준. 브랜치 `feature/issue-78-1`.
>
> ## ⏭ 다음 세션은 **실측부터** 시작한다
>
> V1–V4 · C4 의 **코드는 전부 들어갔다**(아래 §"코드 완료"). 남은 것은 **호스트 실측 하나**다 — Vincent 님 요청으로 실측은 **의도적으로 유예**했고, 한 번에 몰아서 한다. 실측 절차는 §"유예된 실측(M2)".
>
> 즉 **코드를 더 쓰기 전에 실측을 먼저 한다.** 실측 결과가 설계를 바꿀 수 있는 지점(agy 지침 채널·모델 순응)이 아직 열려 있다.

## 지금 상태 — 한 눈에

| 단계                                 | 상태                                                |
| ------------------------------------ | --------------------------------------------------- |
| **Stage 1** 실측 게이트 G1–G8        | ✅ 전부 종료 (아래 표)                              |
| **Phase A** 어댑터 정정              | ✅ 완료 (`42d5d898`)                                |
| **Phase B** CI·README 배선           | ✅ 완료 (`42d5d898`)                                |
| **Phase C1–C3** 경로 좌표 (코드)     | ✅ main `77825966`                                  |
| **M1** main 리베이스 + 어댑터 재생성 | ✅ 완료 — 전체 테스트 초록, 어댑터 30 결정적        |
| **V1 · V3** 경로 수정 (코드)         | ✅ 완료 — 틸데 전개 · 자기탐색 폴백                 |
| **V2 · V4** 스키마 안내 · 계약 경로  | ✅ 코드 완료 — 모델 순응 여부는 실측 대상           |
| **C4** 규칙 채널 (`AGENTS.md`)       | ✅ 완료 — 쓰기 + 읽기 채널 동시 분기                |
| **M2** 호스트 실측                   | ⬜ **다음 작업 · 유예됨** — 아래 §"유예된 실측(M2)" |
| **Phase D/E** agy·Codex 심화         | ⬜ 선택 → [backlog-d-e.md](./backlog-d-e.md)        |
| main 머지·GitHub 경유 설치 확인      | ⬜ 마지막                                           |

**전체 계획: [transition-plan.md](./transition-plan.md)** · 사실 정본: [host-capability-matrix.md](./host-capability-matrix.md) · 절차: [migration-playbook.md](./migration-playbook.md) · 도구 계약: [`tools/plugin-compiler/DETAIL.md`](../../tools/plugin-compiler/DETAIL.md)

---

## 코드 완료 (V1–V4 · C4)

전체 테스트 **4267 통과 / 0 실패**, typecheck 클린, `plugin:adapters:check` 30 unchanged, 훅 번들 가드 통과.

### V1. 틸데 — `toAbsoluteRoot()` 가 `~` 를 전개한다

TODO 원안의 **후보 (a)** 를 채택했다. 세 호스트에 동시 적용된다 — `project_root` 인자는 호스트별로 갈리지 않으므로 Claude 모델도 틸데를 넘길 수 있었고, 이전엔 그게 throw 였다.

- `~` · `~/…` → `os.homedir()` 로 전개 (Windows 는 `~\…` 도).
- `~user` 는 **여전히 거부** — passwd DB 는 셸만 읽는다. 에러 메시지가 그 사실을 말한다.
- 스키마 설명 문구(`PROJECT_ROOT_ARG_DESCRIPTION`)를 **정본 1곳으로 통합** — 5 플러그인 9곳에 복제돼 있었다.

### V3. agy `pluginRoot()` = null — **cwd 를 추측하지 않고** 파일시스템에 묻는다

TODO 원안(`detectHost() !== "claude" ? process.cwd() : null`)은 **미실측 가정**(agy MCP 프로세스의 cwd = 플러그인 디렉터리) 위에 선다. 틀리면 조용히 실패한다 — 이 모듈이 막으려던 바로 그 실패다. 그래서 대신:

```
pluginRoot()  →  CLAUDE_PLUGIN_ROOT ?? (codex ? cwd : locatePluginRoot())
locatePluginRoot()  →  자기 모듈 위치에서 상향 8단계, `.claude-plugin/plugin.json` | `plugin.json` 발견 시 그 디렉터리
```

**검증됨(코드 레벨)**: filid 와 동일 조건(import.meta shim 없는 CJS 번들)에서 `OGHAM_HOST=agy` · env 없음 · cwd 를 일부러 딴 곳에 두고 실행 → `pluginRoot()` 가 **cwd 가 아니라 실제 플러그인 디렉터리**를 반환. esbuild 가 CJS 에서 `import.meta` 를 비우므로 `__filename` 으로 폴백한다.

⇒ **r-statistics `contract.R` 이 세 호스트 모두에서 해석된다** (V4 의 근본 원인이 이거였다).

### C4. 규칙·지침 채널 — `AGENTS.md`

- `hostPaths` 에 `instructionsFile()` · `ruleDocsTarget()` 추가. Claude=디렉터리, Codex=`AGENTS.md` 병합. **agy 는 미실측 → Claude 와 동일** (지원한다고 주장하지 않는다).
- filid `syncRuleDocs` → 채널 분기 (`syncRuleDocsToDirectory` / `syncRuleDocsToFile`). 규칙 문서마다 **자기 마커 구간**을 가져 add/update/drift/remove 의미론이 병합 채널에서도 유지된다. 재실행 안전, 파일 1회 원자적 쓰기.
- **읽기 채널도 같이 고쳤다** (C4 문서가 경고한 함정): 훅엔 `OGHAM_HOST` 가 **없다**(어댑터는 MCP 선언에만 주입) → 호스트 분기 불가 → **모든 채널 합집합 판독**. 안 그랬으면 훅이 방금 배포한 규칙을 "미배포"로 오판했다.
- maencof: 3 핸들러 + 등록부가 `instructionsFile()` 로. SessionStart 훅은 **섹션이 이미 있는 파일을 따라간다** — 안 그러면 MCP 가 `AGENTS.md` 에 병합한 뒤 훅이 `CLAUDE.md` 에 두 번째 사본을 만든다.

> ⚠ **훅은 호스트를 알 수 없다 — 이건 실측이 아니라 구조적 사실이다.** 어댑터가 `OGHAM_HOST` 를 MCP env 에만 넣기 때문이다. 현재는 **읽기=합집합 / 쓰기=Claude 채널** 로 우회했다. 훅의 **쓰기**까지 호스트별로 가르려면 어댑터가 훅 커맨드에도 마커를 주입해야 한다 → **C5 후보** (Codex hooks.json 스키마의 env 지원 여부 미실측).

---

## 유예된 실측 (M2) — **다음 작업**

> **코드는 준비됐고, 실측만 안 했다.** Vincent 님 요청으로 실측을 한 번에 몰아 하기 위해 유예. 아래는 전부 **호스트에서 실제로 돌려야만** 답이 나오는 것들이다.

**선행**: [migration-playbook.md](./migration-playbook.md) §3 (마켓플레이스 등록 → 설치 → TUI trust → `codex exec --json` 관찰). 등록 경로는 **어댑터가 생성된 체크아웃**이어야 한다 — 아니면 가짜 PoC. 확인: `find plugins -maxdepth 3 -path '*/.codex-plugin/plugin.json' | wc -l` = 10.

| #                     | 측정할 것                                                                                                                                                             | 코드가 이미 한 대비                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **M2-1** (원 V1)      | **모델이 `project_root` 를 실제로 넘기는가, 몇 번 만에.** Codex 에서 imbas 도구를 호출시키고 `codex exec --json` 으로 왕복 관찰. 미전달 → 안내 throw → 재시도 회복률. | 틸데가 이제 통과하므로 왕복이 **1회 줄었다**. 남은 실패 경로는 "인자를 아예 안 넘김" 뿐. |
| **M2-2** (원 V2)      | **agy 모델이 절대 워크스페이스 경로를 아는가.** agy 훅 stdin 엔 `workspacePaths[]` 가 있지만 **MCP 모델 컨텍스트에 있는지는 미확인**.                                 | 모르면 agy 의 프로젝트 대상 도구는 못 쓴다. 플러그인 루트는 이미 해결됨(V3).             |
| **M2-3** (원 V3 선행) | **agy MCP 프로세스의 cwd·env** (`lsof -a -p <pid> -d cwd` + `ps eww`).                                                                                                | 이제 **필수 아님** — 자기탐색이 cwd 가정을 제거했다. 다만 사실 확인용으로 여전히 유용.   |
| **M2-4** (원 V4)      | **Codex `run_r` end-to-end** — `contract.R` 이 실제로 source 되는가.                                                                                                  | 경로 해석은 스펙으로 고정됨. 남은 건 진짜 실행.                                          |
| **M2-5** (C4)         | **Codex `codex debug prompt-input` 에 규칙 본문이 실린다** — `AGENTS.md` 병합분이 모델 프롬프트에 도달하는지. + 훅의 규칙 존재 판정이 오판 없는지.                    | 병합·마커·idempotence 는 스펙으로 고정됨.                                                |
| **M2-6** (C4/agy)     | **agy 의 지침 파일이 무엇인가** (`GEMINI.md`? `AGENTS.md`? `.agents/rules/`?). 마커 심어 프롬프트 렌더로 확인.                                                        | 현재 코드는 agy 를 Claude 채널에 둔다 — 실측 후 `instructionsChannel.ts` **한 줄** 수정. |

---

## C4-3. 상태 디렉터리 (미착수 · 우선순위 낮음)

`~/.claude/` 밑에 런타임 상태를 쓰는 지점들 — Codex 로 돌려도 Claude 폴더에 쌓인다. **기능은 동작**하므로 보류. 같은 분기에 얹을 수 있다.

```
deilen/src/constants/paths.ts        (CLAUDE_CONFIG_DIR ?? ~/.claude)
r-statistics  R_STATISTICS_HOME      (= join(claudeRoot(), 'plugins', 'r-statistics'))
```

---

## 게이트 결과 (Stage 1 — 전부 종료)

| #      | 결과                                                                                                                                               |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **G1** | 도구명 `mcp__<server>__<tool>` · **플러그인 스코프 없음** ⇒ 서버명 오버라이드 필수. **`cwd` 누락 블로커 발견·수정**(안 고쳤으면 MCP 9종 무음 사망) |
| **G2** | 신뢰된 훅은 헤드리스 `codex exec` 에서 발화하고 주입 문구가 모델에 도달. **미신뢰 훅은 경고 없이 조용히 스킵** ⇒ cennad 위임 경로 주의             |
| **G3** | `plugin add` 는 enabled 만 · 첫 TUI 진입에서 trust 게이트 · `trusted_hash` 고정 · **"changed"** 가 재신뢰 트리거                                   |
| **G4** | agy 상대 args 는 정상 해석. **위치**가 문제 — `agy plugin install` 이 넣는 곳에선 MCP 가 안 뜨고 `.agents/plugins/` 에서만 뜬다                    |
| **G5** | agy 가 Claude 훅 포맷을 훅 이름 `"hooks"` 로 오독 → 파싱 실패 → **훅 0개 로드**                                                                    |
| **G6** | 스킬은 `<plugin>:<skill>` 로 정상 주입. 단 본문 full-form 도구명과 실제 Codex 도구명 **불일치 확정**                                               |
| **G7** | Codex MCP 는 프로젝트 좌표를 잃는다(MCP `roots` 도 불가) → `hostPaths` 로 대응. **코드 완료, 실측은 M2**                                           |
| **G8** | `~/.codex/rules` 는 **커맨드 승인 allowlist** 였다. 지침 채널은 **`AGENTS.md`**(루트·전역 둘 다 주입·중첩)                                         |

## 어댑터 현황

생성물 **30 파일**, 경로 4종. 손편집 금지 — 정본 수정 후 `yarn plugin:adapters`.

```
plugins/<n>/plugin.json               ×10   ← 루트 매니페스트: agy 마커 + Codex 가 실제로 읽는 경로
plugins/<n>/.codex-plugin/plugin.json ×10   ← 위와 바이트 동일 (Codex 규약 경로)
plugins/<n>/mcp_config.json           × 9   ← agy MCP (상대 args + OGHAM_HOST)
.agents/plugins/marketplace.json      × 1   ← Codex 마켓플레이스
```

- **매니페스트가 왜 두 곳인가**: agy 는 루트 `plugin.json` 을 마커로 요구하고(없으면 우리 `mcp_config.json` 을 덮어써 `OGHAM_HOST` 파괴), Codex 도 그 경로를 읽어 `.codex-plugin` 을 **가린다**. 루트에 최소 마커만 두면 **Codex MCP 가 죽는다** → 두 곳에 같은 전체 매니페스트. 스펙이 바이트 동일을 고정.
- **`.agents/plugins.json`(agy declared)은 폐기됨** — 3가지 형식 모두 로드 실패 실증.
- Claude 무영향 실증 완료 (`--plugin-dir` 로딩 로그·경고 수 동일).
- **플러그인 루트 마커**: 10개 전부 `.claude-plugin/plugin.json` + 루트 `plugin.json` 보유, `files[]` 포함. `locatePluginRoot()` 가 이 둘을 찾는다. 저장소 루트엔 `marketplace.json` 만 있어 **상향 탐색이 루트에서 오탐하지 않는다**.

## 재개 시 주의

1. **이중 체크아웃**: `~/Workspace/ogham`(main · Vincent 님이 다른 개발 진행 중) · `~/Workspace/ogham_mk2`(이 브랜치). 마켓플레이스로 등록할 땐 **어댑터가 생성된 체크아웃**이어야 한다 — 아니면 Codex 가 `.claude-plugin` fallback 으로 떨어져 **어댑터를 타지 않는 가짜 PoC** 가 된다.
2. **정본 체크아웃에 문서를 두지 말 것** — 미추적 파일이라 두 번 유실됐다. 모든 문서는 이 브랜치의 `.metadata/plugin-compiler/` 에 커밋한다.
3. **기존 실패 4건은 해소됨** — cennad `skill-contract.acceptance.test.ts` 포함 전체 초록(4267). Phase E1 주제(스킬 본문 full-form 도구명)는 별건으로 남아 있다.
4. **호스트 PoC 는 정리된 상태** — `~/.codex/config.toml` 이 세션 시작 시점과 바이트 동일. 재실측하려면 마켓플레이스 등록부터 다시 한다(playbook §3).
