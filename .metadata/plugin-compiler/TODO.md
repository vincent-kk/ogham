# TODO — in-place 멀티호스트: 세션 복원 지점

> **여기부터 읽으면 된다.** 2026-07-15 기준. 브랜치 `feature/issue-78-1`.
>
> ## ✅ M2 호스트 실측 완료 — V1–V4·C4 검증됨, 결함 1건(F2) 수정
>
> **원시 로그 정본: [m2-measurement-log.md](./m2-measurement-log.md).** 요약:
>
> - **Codex (M2-1·M2-4·M2-5)**: V1(project_root 전달)·V4(contract.R 소싱·allow-root)·C4(AGENTS.md 병합·모델 프롬프트 도달·훅 합집합 판정)가 **전부 실측 확인**. filid·maencof 양쪽 C4 정상.
> - **결함 F2 발견·수정**: r-statistics `resolveDataRefs` 가 projectRoot 가드의 "retry with project_root" 안내를 `DATA_ROOT_INVALID` 로 삼키던 것을 수정(안내가 모델에 도달하도록). 회귀 테스트 추가.
> - **agy (M2-2·M2-3·M2-6)**: 자기탐색(V3)이 wrong-cwd에서도 플러그인 루트를 정확 해석(결정론적 확인). 단 agy(--print)는 **지침 파일을 자동 주입하지 않고**(모델이 grep 으로 읽음) 워크스페이스 경로도 미주입 → **conservative 코드 유지가 실측으로 정당화됨**(agy 분기 업그레이드 안 함). 환경 제약: agy CLI 미로그인 + print 모드.
> - **가설 정정**: F1(모델은 `~`가 아니라 절대경로 전달 — 틸데 이득 서술만 정정), F3(agy 자동주입 없음 — 위 참조). 둘 다 코드 변경 불요.
>
> Codex 헤드리스 exec 는 **read-only 아닌 MCP 도구를 승인 게이트로 취소**하므로(`--dangerously-bypass-*` 필요), 부수효과 도구(run_r·rule_docs_sync)의 **코드**는 실제 설치 스냅샷 브리지를 Codex env 계약대로 스폰해 MCP 프로토콜로 직접 검증했다(model-facing 호출은 M2-1 read-only 도구로 확인).

## 지금 상태 — 한 눈에

| 단계                                 | 상태                                                                                                                                                                                                           |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stage 1** 실측 게이트 G1–G8        | ✅ 전부 종료 (아래 표)                                                                                                                                                                                         |
| **Phase A** 어댑터 정정              | ✅ 완료 (`42d5d898`)                                                                                                                                                                                           |
| **Phase B** CI·README 배선           | ✅ 완료 (`42d5d898`)                                                                                                                                                                                           |
| **Phase C1–C3** 경로 좌표 (코드)     | ✅ main `77825966`                                                                                                                                                                                             |
| **M1** main 리베이스 + 어댑터 재생성 | ✅ 완료 — 전체 테스트 초록, 어댑터 30 결정적                                                                                                                                                                   |
| **V1 · V3** 경로 수정 (코드)         | ✅ 완료 — 틸데 전개 · 자기탐색 폴백                                                                                                                                                                            |
| **V2 · V4** 스키마 안내 · 계약 경로  | ✅ 완료 — 실측 확인(M2-1·M2-4) + 결함 F2 수정                                                                                                                                                                  |
| **C4** 규칙 채널 (`AGENTS.md`)       | ✅ 완료 — 쓰기 + 읽기 채널 동시 분기 (M2-5 확인)                                                                                                                                                               |
| **M2** 호스트 실측                   | ✅ **완료** — [m2-measurement-log.md](./m2-measurement-log.md) · F2 수정                                                                                                                                       |
| **D1** agy 훅 번역 어댑터            | 🟡 주입훅 보류(F4) — 게이팅(D1b)은 ✅ 완료(`85fea062`, 아래)                                                                                                                                                   |
| **E3/E2** Codex 파일도구 매칭        | ✅ **완료**(`16a161cc`) — `apply_patch`→`Write`/`Edit` 정규화, 가드 발화 실측 ([stage5](./stage5-measurement-log.md))                                                                                          |
| **D1b** agy 게이팅 훅 (번역)         | ✅ **완료 + 라이브 검증**(`85fea062`·`6c75b159`) — 실제 agy 가 `write_to_file` deny 강제·F6 fallback 작동                                                                                                      |
| **Emitter/빌드 배선**                | ✅ **완료**(`b0d0cd0f`) — `buildAgyHooks` 5번째 어댑터(루트 `hooks.json`, PreToolUse→named-group), 3플러그인 `run-agy.mjs` 번들, baseline 30→33, 스모크(deny/allow/F6) 통과                                    |
| **PR #89** (branch→main)             | 🟢 **CI 전부 초록**(macOS·Ubuntu·Windows×Node20/22)·MERGEABLE·CLEAN. Windows 경로 이식 버그 4건 수정(`165333fe`). **머지 보류 — Vincent 이 이 코드가 프로덕션 적용 가능하다고 판단하는 시점에 직접 머지**      |
| main 머지·GitHub 경유 설치 확인      | ⬜ 머지 후 — 마켓플레이스 실설치로 Claude 무영향 라이브 재확인                                                                                                                                                 |
| **Codex 완성도 심화**                | 🟡 **진행 중** — §1 read추적 ✅ **전부**(maencof `5fad890c` + filid·imbas Codex 전용 훅 채널 `9b6aae63`)·§3 process.cwd 감사 ✅(전부 무해). **§2 agents 폴백 = 다음 세션 확정**(Vincent). agy 는 업스트림 대기 |

**전체 계획: [transition-plan.md](./transition-plan.md)** · 사실 정본: [host-capability-matrix.md](./host-capability-matrix.md) · 절차: [migration-playbook.md](./migration-playbook.md) · 도구 계약: [`tools/plugin-compiler/DETAIL.md`](../../tools/plugin-compiler/DETAIL.md)

> **완결성 현황 (2026-07-15, 실측 재확인)**: Claude 무결손·머지 준비는 완료됐으나 **Codex/agy 완전 파리티는 아직 아니다**. Codex=1급(구멍: read추적·agents·일부 cwd), agy=2급(injectSteps·MCP위치 — 업스트림 버그로 우리 코드로 불가). 상세 로드맵은 문서 하단 **§다음 세션 작업 — Codex 완성도 심화** 참조.

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

## 유예된 실측 (M2) — ✅ **완료 (2026-07-15)**

> **실측 완료.** 원시 관측·발견 정본은 [m2-measurement-log.md](./m2-measurement-log.md). 아래 표는 각 항목의 결과.
>
> **결과 한 줄 요약**: Codex 축(M2-1·M2-4·M2-5) 전부 통과 — V1/V4/C4 코드가 Codex 에서 실측 확인됨. 실측 중 **결함 F2**(r-statistics `resolveDataRefs` 가 projectRoot 안내를 `DATA_ROOT_INVALID` 로 삼킴) 발견·수정·회귀테스트. agy 축(M2-2·M2-3·M2-6)은 자기탐색(V3) 결정론적 확인 + **agy 는 지침 파일을 자동 주입하지 않음**을 확인 → conservative 코드 유지(업그레이드 안 함). agy CLI 미로그인·print 모드 제약은 로그에 명시.

**실측 방법 주의**: Codex 헤드리스 `codex exec` 는 read-only 아닌 MCP 도구를 승인 게이트로 취소한다(`--dangerously-bypass-*` 필요, auto 모드 분류기가 차단). 부수효과 도구(run_r·rule_docs_sync)의 **코드**는 실제 설치 스냅샷 브리지를 Codex env 계약(cwd=스냅샷·`OGHAM_HOST`·`CLAUDE_PLUGIN_ROOT` 부재)대로 스폰해 MCP 프로토콜로 직접 검증(`scratchpad/mcp-call.mjs`). model-facing 전달은 M2-1(read-only `config_get`)로 확인. **선행**: [migration-playbook.md](./migration-playbook.md) §3. `find plugins -maxdepth 3 -path '*/.codex-plugin/plugin.json' | wc -l` = 10.

**결과표** (측정할 것 → 결과):

| #                 | 결과                                                                                                                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M2-1** (V1)     | ✅ Codex 모델이 `project_root`(절대경로) **첫 호출 자발 전달**, 복구 왕복 0회. (F1: 모델은 `~` 아닌 절대경로 사용 — 틸데 이득 서술만 정정, 코드 불변)                               |
| **M2-2** (V2)     | ✅ agy 는 워크스페이스 절대경로를 모델 컨텍스트에 **미주입** — 모델이 `pwd` 로 발견(transcript 확인). project_root 전달은 pwd 발견 후 가능. 코드(선택 인자) 호환.                   |
| **M2-3** (V3)     | ✅ agy 계약(wrong cwd·env 부재)에서 `run_r` 성공 = **자기탐색이 플러그인 루트 정확 해석**. (실 MCP 프로세스 cwd/env 측정은 미로그인으로 유예 — 자기탐색이 이를 불요로 함)           |
| **M2-4** (V4)     | ✅ contract.R 소싱(manifest present)·allow-root(project_root) 정상, 가드 throw 확인. **결함 F2 발견·수정.**                                                                         |
| **M2-5** (C4)     | ✅ filid·maencof 가 Codex 에서 `AGENTS.md` 병합, `codex debug prompt-input` 에 규칙 본문 도달, idempotent, 훅 합집합 판정 오판 없음.                                                |
| **M2-6** (C4/agy) | ✅ **agy(--print)는 GEMINI/AGENTS/CLAUDE 자동주입 안 함**(모델 grep 으로 읽음, transcript 확인) → `instructionsChannel.ts` agy 분기 **업그레이드 안 함**(conservative 유지가 정당). |

---

## 다음 작업 — 완전 동등 (achievable 순차 + 플랫폼 한계 우회·고지)

> Vincent 님 지시: **순차적으로 전부**, 플랫폼 한계 3종은 **우회+고지**. 실측 정본: [stage5-measurement-log.md](./stage5-measurement-log.md).

1. ~~**E3/E2 — Codex 파일도구 매칭**~~ → ✅ **완료 (`16a161cc`)**. 실측이 원안 가설을 정정: Codex 는 `apply_patch`(V4A 패치)·`Bash` 만 보내고 Read/Grep/Glob 도구는 **원천 미발화**(모델이 셸로 읽음). 이름 매핑이 아니라 **패치 파싱**이 필요 — `@ogham/cross-platform/codex-hooks` 가 `apply_patch`→`Write`/`Edit`(file_path·content 추출) 정규화. maencof Layer1·filid 문서계약 deny 가 Codex `apply_patch` 에서 발화, Claude 와 바이트 동일(E2E 실측). **읽기 계열 추적은 이식 불가**(고지).
2. ~~**D1b — agy 게이팅 훅**~~ → ✅ **번역 완료 + 라이브 검증 (`85fea062`·`6c75b159`)**. **실제 agy 실행으로 확정**: agy 가 훅 발화·`write_to_file` `{decision:deny}` 강제(라이브 trace)·F6 fallback 작동. `agy-hooks` 확장(도구맵·PreToolUse 번역·deny 역변환) + 편집파일 경로 cwd 역산(F6). **차단 가드만 이식**(주입 채널 없음). 모델 셸 우회는 전 호스트 공통 한계.
3. ~~**Emitter/빌드 배선**~~ → ✅ **완료 (`b0d0cd0f`)**. compiler `buildAgyHooks`(Claude PreToolUse → agy named-group, `*` matcher, `node bridge/run-agy.mjs PreToolUse bridge/<handler>.mjs` — 핸들러 경로는 Claude 커맨드에서 추출) + **PreToolUse 보유 3플러그인(filid·imbas·maencof)** build-hooks 가 `bridge/run-agy.mjs`(cross-platform agyRunner main, 별도 esbuild 패스+캡+금지패턴, 3.3 KB) 번들 + `package.json:files`(루트 `hooks.json`; `bridge/` 는 이미 포함) + baseline **30→33** + DETAIL/INTENT. **PreToolUse 만 방출**(주입훅은 F4 로 死코드·매 턴 스폰이라 제외; PostToolUse 는 러너 미지원). 스모크: agy `write_to_file`→maencof Layer1(빈 workspacePaths, F6 역산)→**deny**, 비-Layer1/비-FCA→allow, 브리지 결정론적, 전체 4326 통과.
   - **F6 해소** (`6c75b159`): agy 훅엔 프로젝트 경로 신호 없음(workspacePaths `[]`·GEMINI_PROJECT_DIR 없음) → 러너가 편집 파일 경로로 cwd 역산 + maencof `isInsideMaencofVault` walk-up. 라이브 실측(빈 workspace 에서 Layer-1 deny).
   - **셸 우회 (고지)**: 모델이 Bash(`run_command`)로 파일 편집 시 write 가드 우회 — Claude·Codex·agy 전 호스트 공통 guardrail 한계(OpenAI 공식 문서 확인). 차단 가드는 주 경로(Write/Edit↔apply_patch↔write_to_file)만 막음.
   - **실측 발견 (배선 중, `2e4f08b0`)**: F6(`6c75b159`)이 `isMaencofVault` 를 리팩터하며 maencof 브리지 4개 중 pre-tool-use 만 재빌드하고 나머지 3개(공유 lifecycle dispatcher 가 인라인)를 **stale** 로 남겼다 — 이번 재빌드가 교정(기능 동일, 재현성 복구). agy 러너 스모크는 **cwd=플러그인 루트**(agy 실행 모델: cwd=hooks.json 위치)에서만 유효 — repo 루트 실행 시 상대 핸들러 경로 미해석으로 러너가 no-op→allow(가짜 통과 주의).
4. **L2·L3 우회·고지** — agy MCP 배치 스크립트/README(L2), Codex agents 단일-폴백·설치안내(L3). 정본: matrix §10.

**커밋 완료**: F2+M2(`23003510`), agy 어댑터 기반(`01d1ca98`), E2/E3(`16a161cc`), D1b 번역(`85fea062`), maencof stale 브리지 교정(`2e4f08b0`), **Emitter/빌드 배선(`b0d0cd0f`)**, main 동기화 2회(`9f39355a`·`73d99ccc`), Windows 경로 수정(`165333fe`). 상세: [stage5-measurement-log.md](./stage5-measurement-log.md) · [backlog-d-e.md](./backlog-d-e.md) · [matrix §10](./host-capability-matrix.md).

## 다음 세션 작업 — Codex 완성도 심화 (2026-07-15 실측 검증)

> agy 는 업스트림 버그(injectSteps·MCP 위치) 대기 → **Codex 집중**. 아래는 **코드·소스 실측으로 실현성을 확인한** 순위. "완전 파리티" 가 아니라 "achievable 만큼 + 정직 고지" 원칙 유지.

### 0. (선행) PR #89 머지 후 — GitHub 설치 라이브 게이트

마켓플레이스 실설치로 **Claude 무영향 라이브 재확인**(지금까지 `--plugin-dir` 로그 + 구조적 확인뿐). 루트 `plugin.json`·`hooks.json` 이 실제 Claude 설치에 무영향인지. Codex 설치·도구노출·훅 trust 도 함께.

### 1. Read 추적 부분 복구 (Codex) — ✅ **완료 (maencof + filid·imbas, option a)**

- **실측**: Codex 는 파일 읽기를 `Bash` 로 직렬화(`Read` 별칭 없음 — 소스 확정). **matcher 확인**: maencof=`*`(Bash 훅 **이미 발화**) / filid·imbas=`Read|Write|Edit`(Bash **미발화**).
- **maencof ✅ (`5fad890c`)**: codex-hooks 에 `parseBashRead`(순수 파서, `cat/head/tail/less/more/bat <경로>`→`Read`) + `normalizeCodexToolUse` Bash 분기. vaultRedirector 가 Read 처리(matcher 변경 불요). 종단 스모크: vault `.md` read→권고, `.txt`·파이프→무발화. **가치 재확인**: Codex 가 PreToolUse `additionalContext` 를 주입(PR #20692, 2026-05-05 병합 — stage5 line 116 정정)하므로 권고가 실제 모델 도달.
- **filid·imbas ✅ (option a — Codex 전용 훅 채널)**: 신규 emitter 빌더 `buildCodexHooks` 가 Claude 훅 전체를 복사하되 read 잡는 PreToolUse matcher(`Read|Write|Edit`)에 `|Bash` 추가한 `.codex-plugin/hooks.json` 방출, Codex 매니페스트 `hooks` 가 이를 가리킴. **Claude 무영향**(`hooks/hooks.json` 그대로 — git diff 0 실측). baseline 33→35(filid·imbas 각 +1), adapters:check 멱등, 전체 4355 통과. `parseBashRead` 공유 코드가 셸 read 를 Read 로 승격 → filid·imbas Read 컨텍스트 주입 복구.
- **한계 고지**: 셸 표현 무한(파이프·grep·awk) → **완전 fidelity 불가**, Codex 도 "단순 셸만" 인터셉트 → 흔한 단순 읽기만 복구. `codex-read-matcher` 경고가 이 잔여 한계를 계속 표면화.

### 2. Codex agents 폴백 — ⬅️ **다음 세션 착수 확정 (Vincent)** · 구조적 부재, 단일-폴백 (L3)

- **실측**: Codex 매니페스트에 `agents` 컴포넌트 **없음**(소스 `plugin/manifest.rs`). 모든 Codex 플러그인 공통 — 서브에이전트를 플러그인으로 등록 불가.
- **작업**: 위원회 의존 스킬(filid Phase D 리뷰·prawf·atlassian 미디어)에 "Codex 면 **단일 에이전트 인라인**" 분기 or MCP 오케스트레이션 재설계. 병렬·격리는 잃음.
- (미확인: Codex 자체 비-플러그인 에이전트 경로 유무 — 필요 시 조사.)

### 3. process.cwd() 잔여 감사 — ✅ **완료: 전부 무해로 종결** (2026-07-16 감사)

- **감사 결과**: MCP+훅 도달 `process.cwd()` 총 **19개**(테스트 제외) = 훅 15개 + 비-훅 4개. **코드 변경 불요** — roadmap 가설("사실상 해결") 확인.
- **훅 15개**: maencof 14·maencof-lens 1 = **전부 `/hooks/` 하위**(경로 확인). Codex 는 훅에 세션 cwd(실제 프로젝트) 제공 → **무해**.
- **비-훅 MCP 도달 4개 — 전부 무해**(읽고 판정):
  - `deilen resolveMarkdown.ts:21` — **주석**일 뿐(실코드는 `resolve(workspace, path)`, workspace=`projectRoot(project_root)`). 이미 정확.
  - `deilen bridgeRoot.ts:35` — 플러그인 **자기 `bridge/` 자산** 위치 최후 폴백(pluginRoot→import.meta 8단계 walk-up 실패 후에만 도달). 프로젝트 경로 아님.
  - `filid getSgModule.ts:21`·`imbas astGrepShared.ts:43` — `@ast-grep/napi` **네이티브 모듈 로드** `createRequire` `_base` 3순위 폴백(import.meta.url·`__filename` 우선). 프로젝트 경로 아님.

### 4. agy — 업스트림 대기 (착수 보류)

- **F4** injectSteps 미렌더 → 컨텍스트 주입훅 무가치. 어댑터·러너 **준비됨**, agy 가 렌더하면 emitter 에 PreInvocation 방출만 추가.
- **L2** MCP `agy plugin install` 위치 버그 → `.agents/plugins/` 배치 스크립트/README(우회). agy CLI 수정 전까지 수동.

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

생성물 **35 파일**, 경로 6종. 손편집 금지 — 정본 수정 후 `yarn plugin:adapters`.

```
plugins/<n>/plugin.json               ×10   ← 루트 매니페스트: agy 마커 + Codex 가 실제로 읽는 경로
plugins/<n>/.codex-plugin/plugin.json ×10   ← 위와 바이트 동일 (Codex 규약 경로)
plugins/<n>/mcp_config.json           × 9   ← agy MCP (상대 args + OGHAM_HOST)
plugins/<n>/hooks.json                × 3   ← agy 훅 (filid·imbas·maencof, PreToolUse→named-group)
plugins/<n>/.codex-plugin/hooks.json  × 2   ← Codex 전용 훅 (filid·imbas, read matcher+Bash)
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
5. **main 동기화됨 (2회 — 최신 `73d99ccc`)** — (a) `9f39355a`: origin/main(#87 portableResolve·버전범프·crosscheck) 흡수, 충돌 해소 `absoluteRoot.ts`(틸데+portableResolve 결합)·`hostPaths/INTENT.md`, filid HEAVY 캡 24→25 KB. (b) `73d99ccc`: cennad agy #88(antigravity `--sandbox` 복원·agy 1.1.2 모델명) 흡수, 충돌은 cennad 번들뿐(재빌드). 현재 HEAD..origin/main=0. 전체 4335 통과. main 진행 시 **주기적 재병합 권장**.
6. **⚠ plugin-compiler 아키텍처 분기 — 이 브랜치가 정본 (Vincent 확인)**: main 은 리팩터 이전 `emit/ir/profiles/verify` 구조(`4ad65964`, 7-12)를 아직 갖고, 이 브랜치는 `9078cc2a`(7-15)로 **in-place `adapters/pipeline` 생성기**로 리팩터했다(agy 훅은 `agyHooks/agyRunner`+`buildAgyHooks`, main 엔 없음). 3-way 병합은 이 브랜치 구조를 유지한다(main 이 emit/ir 재수정 안 함 → 삭제가 이김). **이 브랜치를 main 에 머지할 땐 main 의 emit/ir 를 이 브랜치 adapters/ 로 대체해야 한다** — 단순 fast-forward 아님, plugin-compiler 는 이 브랜치가 승자.
