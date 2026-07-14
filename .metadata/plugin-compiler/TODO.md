# TODO — in-place 멀티호스트: 세션 복원 지점

> **여기부터 읽으면 된다.** 2026-07-15 기준. 브랜치 `feature/issue-78-1`.
>
> **남은 작업은 전부 이 브랜치에서 한다.** 정본 런타임(경로 좌표)은 main 에서 이미 들어왔지만, **그 수정이 실제 호스트에서 도는지는 아직 아무도 확인하지 않았다.** 검증 하네스(호스트 PoC 절차·프로브)가 이 브랜치에 있으므로 재검증도 여기서 이어간다. 규칙 채널(C4)도 같은 이유로 여기서 한다 — 같은 `hostPaths` 헬퍼를 건드리기 때문이다.

## 지금 상태 — 한 눈에

| 단계                                | 상태                                                            |
| ----------------------------------- | --------------------------------------------------------------- |
| **Stage 1** 실측 게이트 G1–G8       | ✅ 전부 종료 (아래 표)                                          |
| **Phase A** 어댑터 정정             | ✅ 완료 (`42d5d898`)                                            |
| **Phase B** CI·README 배선          | ✅ 완료 (`42d5d898`)                                            |
| **Phase C1–C3** 경로 좌표 (코드)    | ✅ main `77825966` 에 반영됨 — **단 호스트 실측은 0**           |
| **M1** main 머지 + 어댑터 재생성    | ⬜ **다음 작업 (선행 조건)**                                    |
| **V1–V4** 경로 수정 재검증          | ⬜ **핵심** — 아래 §"재검증" 참조                               |
| **C4** 규칙 채널                    | ⬜ → [stage4-rules-channel.md](./stage4-rules-channel.md)       |
| **Phase D/E** agy·Codex 심화        | ⬜ 선택 → [backlog-d-e.md](./backlog-d-e.md)                    |
| main 머지·GitHub 경유 설치 확인     | ⬜ 마지막                                                       |

**전체 계획: [transition-plan.md](./transition-plan.md)** · 사실 정본: [host-capability-matrix.md](./host-capability-matrix.md) · 절차: [migration-playbook.md](./migration-playbook.md) · 도구 계약: [`tools/plugin-compiler/DETAIL.md`](../../tools/plugin-compiler/DETAIL.md)

---

## M1. main 머지 + 어댑터 재생성 (선행 조건)

경로 좌표 코드(`hostPaths`)는 **main 에만 있고 이 브랜치엔 없다.** 재검증을 하려면 먼저 가져와야 한다.

```bash
git merge main
yarn plugin:adapters        # 필수 — 아래 이유
yarn plugin:adapters:check  # 30 unchanged 확인
```

⚠ **재생성을 빼먹으면 안 된다**: main `b89e9be4` 에서 **filid MCP 서버명이 `t` → `tools`** 로 바뀌었다. 이 브랜치의 어댑터는 아직 `t` 기준이다. 잊어도 CI 의 `plugin:adapters:check` 가 exit 1 로 잡는다(그게 그 게이트를 만든 이유다).

---

## V1–V4. 경로 수정 재검증 — **이게 핵심이다**

`hostPaths` 는 코드로는 들어갔지만 **호스트에서 한 번도 돌려본 적이 없다.** 설계가 몇 가지 가정 위에 서 있는데, 그중 둘은 **실측으로 이미 흔들린다.**

### 현재 설계 (main `77825966`)

```ts
pluginRoot()  →  CLAUDE_PLUGIN_ROOT ?? (detectHost() === "codex" ? process.cwd() : null)

projectRoot(explicit?)
  explicit 있음 → requireAbsoluteRoot()   // path.isAbsolute() 아니면 throw
  claude        → process.cwd()
  codex/agy     → 세션 메모(첫 호출이 준 값) ?? throw("project_root 를 절대경로로 다시 주세요")
```

도구 스키마에 `project_root?` 선택 인자가 있고(atlassian·cennad·deilen·imbas·r-statistics), 모델이 읽는 설명은:

> `Absolute path of the workspace directory. Omit on Claude Code, where this server already runs from the workspace; required on hosts that launch it from the plugin install directory.`

즉 **"실패시키고 안내 메시지로 모델을 재시도시키는" 자기교정 루프**다. 스킬 본문에는 안내가 없다 — 스키마 설명과 에러 메시지가 전부다.

### V1. Codex — 모델이 절대경로를 실제로 넘기는가 ⚠ **가장 중요**

- **틸데 위험**: Codex TUI 는 워크스페이스를 **`~/Workspace/ogham_mk2`** 로 표시한다. `toAbsoluteRoot()` 는 `path.isAbsolute()` 를 쓰므로 **틸데는 거부**된다. 모델이 자기 컨텍스트에서 본 문자열을 그대로 넘기면 실패한다.
- **회복 가능한가**: 미전달 → 안내 throw → 재시도 → 틸데 → 두 번째 throw → 재시도. **이 왕복을 모델이 실제로 완주하는가? 몇 번 만에?** 못 하면 도구가 사실상 죽는다.
- **측정**: Codex 에서 imbas 도구(`manifest_get` 등)를 실제 호출시키고 `codex exec --json` 으로 왕복을 관찰.
- **결과에 따른 대응**: (a) `toAbsoluteRoot` 가 `~` 를 전개하도록 완화, (b) 스키마 설명에 "expand `~` yourself" 명시, (c) 스킬 본문에 안내 추가 — **어느 쪽이든 정본 수정이라 이 브랜치에서 결정한다.**

### V2. agy — 같은 질문

agy 모델이 절대 워크스페이스 경로를 아는가. agy 는 훅 stdin 에 `workspacePaths[]` 를 주지만 **MCP 모델 컨텍스트에 절대경로가 있는지는 미확인.**

### V3. agy — `pluginRoot()` 가 `null` 을 반환한다 (잠재 버그)

```ts
return detectHost() === "codex" ? process.cwd() : null;   // ← agy 분기 없음
```

agy 에서는 `CLAUDE_PLUGIN_ROOT` 도 없고 codex 분기도 안 타므로 **`null`** 이다. r-statistics `contractScriptPath()` 가 존재하지 않는 폴백 경로로 떨어져 **`run_r` 이 agy 에서 깨질 수 있다.**

- **선행 측정**: **agy 가 띄운 MCP 프로세스의 cwd 와 env** (`lsof -a -p <pid> -d cwd` + `ps eww`). 상대 args 가 플러그인 디렉터리 기준으로 풀린다는 것까지는 확인했지만, **프로세스 cwd 자체가 플러그인 디렉터리인지는 재지 않았다.** 그 결과가 곧 agy 분기의 근거다.
- cwd = 플러그인 루트로 확인되면 `pluginRoot()` 를 `detectHost() !== "claude" ? process.cwd() : null` 로 넓히면 된다.

### V4. Codex — r-statistics `run_r` end-to-end

`pluginRoot()` = `process.cwd()` 로 `shared/contract.R` 이 실제로 해석되는지 확인. **[stage4-host-paths.md](./stage4-host-paths.md) 의 완료 기준인데 아직 아무도 측정하지 않았다.** 여기서 닫는다.

> **검증 절차·프로브**: [migration-playbook.md](./migration-playbook.md) §3 (마켓플레이스 등록 → 설치 → TUI trust → `codex exec --json` 관찰). 등록 경로는 **어댑터가 생성된 체크아웃**이어야 한다 — 아니면 가짜 PoC 다.

---

## C4. 규칙 채널 (재검증 후)

**→ [stage4-rules-channel.md](./stage4-rules-channel.md)** (의뢰서 정본)

filid `syncRuleDocs`(`.claude/rules/*.md`)·maencof `claudeMdMerger`(`CLAUDE.md`)의 **Codex 타깃 = `AGENTS.md` 병합**. `~/.codex/rules` 는 커맨드 승인 allowlist 라 **쓰면 안 된다**(G8).

⚠ **함정**: 쓰기 채널만 바꾸고 **읽기 채널**(filid 훅이 `.claude/rules/` 를 stat 해서 규칙 존재를 판정)을 놔두면 훅이 "규칙 없음" 으로 오판한다.

V1–V4 뒤에 하는 이유: 같은 `hostPaths` 헬퍼를 건드리므로, 헬퍼가 실제로 도는 걸 확인한 다음이 안전하다.

---

## 게이트 결과 (Stage 1 — 전부 종료)

| #      | 결과                                                                                                                                         |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **G1** | 도구명 `mcp__<server>__<tool>` · **플러그인 스코프 없음** ⇒ 서버명 오버라이드 필수. **`cwd` 누락 블로커 발견·수정**(안 고쳤으면 MCP 9종 무음 사망) |
| **G2** | 신뢰된 훅은 헤드리스 `codex exec` 에서 발화하고 주입 문구가 모델에 도달. **미신뢰 훅은 경고 없이 조용히 스킵** ⇒ cennad 위임 경로 주의       |
| **G3** | `plugin add` 는 enabled 만 · 첫 TUI 진입에서 trust 게이트 · `trusted_hash` 고정 · **"changed"** 가 재신뢰 트리거                             |
| **G4** | agy 상대 args 는 정상 해석. **위치**가 문제 — `agy plugin install` 이 넣는 곳에선 MCP 가 안 뜨고 `.agents/plugins/` 에서만 뜬다              |
| **G5** | agy 가 Claude 훅 포맷을 훅 이름 `"hooks"` 로 오독 → 파싱 실패 → **훅 0개 로드**                                                              |
| **G6** | 스킬은 `<plugin>:<skill>` 로 정상 주입. 단 본문 full-form 도구명과 실제 Codex 도구명 **불일치 확정**                                         |
| **G7** | Codex MCP 는 프로젝트 좌표를 잃는다(MCP `roots` 도 불가) → `hostPaths` 로 대응. **단 V1–V4 로 실측 확인 필요**                                |
| **G8** | `~/.codex/rules` 는 **커맨드 승인 allowlist** 였다. 지침 채널은 **`AGENTS.md`**(루트·전역 둘 다 주입·중첩)                                   |

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

## 재개 시 주의

1. **이중 체크아웃**: `~/Workspace/ogham`(main · Vincent 님이 다른 개발 진행 중) · `~/Workspace/ogham_mk2`(이 브랜치). 마켓플레이스로 등록할 땐 **어댑터가 생성된 체크아웃**이어야 한다 — 아니면 Codex 가 `.claude-plugin` fallback 으로 떨어져 **어댑터를 타지 않는 가짜 PoC** 가 된다. 확인: `find plugins -maxdepth 3 -path '*/.codex-plugin/plugin.json' | wc -l` = 10.
2. **정본 체크아웃에 문서를 두지 말 것** — 미추적 파일이라 두 번 유실됐다. 모든 문서는 이 브랜치의 `.metadata/plugin-compiler/` 에 커밋한다.
3. **기존 실패 4건**: cennad `skill-contract.acceptance.test.ts` — 스킬 본문에서 full-form 도구명이 빠졌는데 테스트는 아직 기대한다. 우리 변경과 무관(HEAD 에서도 재현). Phase E1 과 같은 주제.
4. **호스트 PoC 는 정리된 상태** — `~/.codex/config.toml` 이 세션 시작 시점과 바이트 동일. 재실측하려면 마켓플레이스 등록부터 다시 한다(playbook §3).
