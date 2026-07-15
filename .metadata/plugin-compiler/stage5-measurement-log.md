# Stage 5 / Phase D-E 실측 로그 (2026-07-15, 2차 세션)

> E2/E3(Codex 파일도구 매칭)·D1b(agy 게이팅)·emitter 선행조건을 실측한 세션 기록.
> 확정 결론은 host-capability-matrix.md / backlog-d-e.md / TODO.md 로 이관한다.
> 환경: codex-cli 0.144.4 · agy 1.1.2. 측정 하네스: stdin 덤프 훅 probe(Codex·agy 각각).

## 측정 방법 주의

- **Codex**: 미신뢰 훅은 **조용히 스킵**(실측 재확인). 헤드리스에서 훅을 발화시키려면 `codex exec --dangerously-bypass-hook-trust` 필요(샌드박스는 `workspace-write` 유지). auto-mode 분류기가 이 플래그를 막으므로 Vincent 님 승인하에 실행.
- **agy**: `agy plugin install <dir>` 로 probe 등록 후 `agy --print`. 단 **--print 는 argv 플래그를 모델 컨텍스트에 주입**해 모델이 프롬프트를 CLI 질문으로 오독함 → 플래그 없이 프롬프트만 전달해야 도구 호출 유발. write 는 `--mode accept-edits`(위험 플래그 아님)로 자동수락.

## E2/E3 — Codex 파일도구 매칭 (✅ 코드 완료·검증)

### 실측: Codex PreToolUse stdin 계약

Codex 모델(gpt-5.6-sol)이 파일을 편집·생성할 때 훅 stdin:

```json
{ "tool_name": "apply_patch",
  "tool_input": { "command": "*** Begin Patch\n*** Update File: <절대경로>\n@@\n-old\n+new\n*** End Patch" },
  "cwd": "<세션 cwd = 사용자 프로젝트>", "session_id": "...", "hook_event_name": "PreToolUse", ... }
```

- **파일 편집/생성 → `tool_name:"apply_patch"`**, `tool_input:{command:<V4A 패치>}` — `file_path` 없음. Add File(생성)·Update File(편집)·Delete File.
- **셸(읽기·grep·ls 전부) → `tool_name:"Bash"`**, `tool_input:{command}`. 모델은 `Read`/`Grep` 도구를 **안 쓰고** 셸 `cat`/grep 으로 처리.
- **`Read`/`Grep`/`Glob` 도구 미발화** — matcher 를 걸어도 안 뜬다(모델이 셸 경유).
- 훅은 **세션 cwd(실제 프로젝트)를 받는다** — MCP(§9)와 달리 경로 문제 없음. `permission_mode` 도 포함.
- PostToolUse 도 `tool_input`+`tool_response`(성공 파일 목록) 를 실어준다(agy 와 대조).

### 정정된 가설 (F5)

TODO 원안 "공유 Codex↔Claude 파일도구 **매핑 헬퍼**로 정규화 (fully achievable)" 는 **부정확**했다. 실측 결과:

1. Codex 는 `apply_patch`(패치 텍스트)를 보내므로 **이름 매핑만으론 부족** — `tool_input.command`(V4A 패치)를 **파싱**해 `file_path`/content 를 추출해야 한다.
2. **읽기 계열(Read/Grep/Glob)은 원천 발화 불가** — 모델이 셸로 읽는다. filid Read 주입·maencof vaultRedirector·imbas read-context 는 Codex 에서 **구조적으로 이식 불가**(플랫폼 한계, E3).

### 채택 코드

`@ogham/cross-platform/codex-hooks` — 순수 정규화(`16a161cc`): `apply_patch` 의 패치를 파싱해 첫 파일 연산을 Claude `Write`(Add, content=전체 파일) / `Edit`(Update, old/new=hunk) 로 재작성. filid/imbas/maencof PreToolUse 엔트리에 배선. 그 외 도구·Claude·agy 무영향.

### E2E 검증(빌드된 브리지)

- maencof layerGuard: Codex `apply_patch`(편집·생성)로 `01_Core/` 겨냥 → **`{decision:deny}`**, 비-Layer1 → allow, Claude Edit 와 **바이트 동일**.
- filid preToolValidator: Codex `apply_patch` ADD 60줄 INTENT.md → **deny**(50줄 초과), 짧은 .ts → allow. Claude Write 와 동일.
- 회귀 0 (filid 1137·imbas 277·maencof 1250). codexHooks 14 테스트.

### 남는 한계(정직 고지)

- 읽기 계열 추적(Read/Grep/Glob) Codex 이식 불가.
- 다중 파일 `apply_patch` 는 첫 파일만 가드(모델은 패치당 1파일 방출 — 실측).
- Update 문서검증은 hunk 기반(부분적) — 단 add 는 전체 파일이라 정확, edit 는 훅이 디스크 실파일 읽어 시뮬레이션.

## D1b — agy 게이팅 훅 (✅ 번역 완료·검증 / 배선 유예)

### 실측: agy PreToolUse 계약 + enforcement

```json
{ "toolCall": { "name": "write_to_file", "args": { "TargetFile":"...", "CodeContent":"...", "Overwrite":false } },
  "stepIdx": 4, "conversationId":"...", "workspacePaths":[], "transcriptPath":"~/.gemini/...", ... }
```

- **PreToolUse 는 `toolCall:{name,args}` 를 실어준다** — 게이팅 가능. 도구명·인자(실측):
  `view_file{AbsolutePath}`→Read, `write_to_file{TargetFile,CodeContent}`→Write, `replace_file_content{TargetFile}`→Edit, `run_command{CommandLine,Cwd}`→Bash, `grep_search`→Grep. args 는 PascalCase.
- **✅ agy 는 `{decision:"deny"}` 를 강제한다** — probe 가 `view_file` 을 deny 하자 모델이 `ask_permission`·`list_permissions` 시도 후 `grep_search` 로 **우회**해 읽었다. ⇒ 게이팅 채널은 **작동**(injectSteps F4 와 대조). 단 모델은 단일 도구 deny 를 다른 도구로 우회 가능.
- **PostToolUse 도 `toolCall` 을 실어준다**(agy hooks 문서엔 stepIdx/error 만 적혀 있으나 실측은 toolCall 포함).

### 채택 코드

`@ogham/cross-platform/agy-hooks` 확장(`85fea062`): `toolMap`(agy→Claude 도구·인자), `toClaudeInput` PreToolUse, `toAgyResponse`(permissionDecision:deny→`decision:deny`), `runAgyHook` PreToolUse 라우팅(allow no-op). 32 테스트.

### E2E 검증(runner + 실 maencof 브리지)

`workspacePaths:[vault]` 를 채운 agy PreToolUse 페이로드를 `runAgyHook`→maencof 브리지로 흘려보냄:

- agy `write_to_file`/`replace_file_content` → `01_Core/` → **`{decision:deny}`**(가드 사유 그대로). 비-Layer1·view_file → `{decision:allow}`.

### 정정된 가설 / 남는 블로커 (F6)

- **`workspacePaths` 가 --print 에서 항상 비어 있다`[]`**(--add-dir 무시). 다른 필드도 사용자 프로젝트 경로를 안 준다. 러너 cwd=`workspacePaths[0]` 가 비면 `isMaencofVault`/`isFcaProject` 가 프로젝트를 못 잡아 **가드 no-op**. agy 문서는 workspacePaths 를 채운다고 명시 → **대화형 IDE 는 채울 것으로 추정하나 미검증**. ⇒ D1b 런타임 가드-가치는 **대화형 workspacePaths 주입에 달려 있다**.
- **agy PreToolUse 엔 주입 채널이 없다**(응답=decision/reason/permissionOverrides 뿐) → 권고성 `additionalContext`(filid 구조가드 경고·maencof vaultRedirector) 는 **손실**. 차단 가드(maencof Layer1·filid 문서계약 deny)만 이식.

## Emitter 선행조건 — Codex root `hooks.json` 오독 (✅ 안전 확정)

**측정**: `.codex-plugin/plugin.json` 이 `hooks:"./hooks/hooks.json"`(subdir) 를 선언 + 플러그인 **루트에 agy-format `hooks.json`**(named-group) 병치한 probe2 를 Codex 설치·실행.

- ✅ **subdir 훅 발화**(Codex 가 선언된 `hooks/hooks.json` 읽음).
- ✅ **루트 agy `hooks.json` 은 Codex 가 무시** — 파싱 에러 0건, 루트 훅 미발화. ⇒ 매니페스트 선언이 있으면 Codex 는 루트 `hooks.json` 을 **읽지 않는다**(backlog 의 "보완(replace 아님)" 우려는 실측으로 해소).

⇒ **emitter 는 agy-format `hooks.json` 을 플러그인 루트에 안전하게 둘 수 있다**(agy=루트 발견 / Codex=subdir 선언만). ponytail 식 파일명 변경(claude-codex-hooks.json) 불요.

---

## 2차: 라이브 agy 검증 + 공식/커뮤니티 조사 (같은 세션)

### F6 해소 — agy 훅엔 프로젝트 경로가 없다 → 편집 파일 경로로 역산

측정: agy PreToolUse 훅 env·payload 전수 — `workspacePaths:[]`(git repo 여부 무관), **`GEMINI_PROJECT_DIR` 없음**(Medium 가이드 주장 반증), cwd=플러그인 dir, env엔 `ANTIGRAVITY_CONVERSATION_ID` 뿐. **유일한 프로젝트 신호는 `toolCall.args.TargetFile`(절대경로)**. ⇒ 러너가 workspace 부재 시 편집 파일의 디렉터리를 cwd 로 삼고 가드가 상향탐색. filid `isFcaProject` 는 이미 walk-up; maencof 는 `isInsideMaencofVault`(walk-up 변형) 추가해 layerGuard 만 사용(다른 호출부는 cwd=vault 루트 가정 유지). **커밋 `6c75b159`**.

### 라이브 agy E2E (agy 1.1.2, 실제 실행)

maencof 브리지 + `bridge/run-agy.mjs`(esbuild 번들)를 agy 플러그인으로 등록, agy --print 로 Layer-1 파일 편집 유도:

- ✅ **agy 가 mnguard 훅 발화** — run-agy 체인 실행(trace 확인).
- ✅ **agy 가 `write_to_file` `{decision:deny}` 강제** — 모델이 write_to_file 차단당함(trace: write_to_file→deny).
- ✅ **F6 fallback 라이브 작동** — 빈 workspacePaths 에서 TargetFile 로 cwd 역산 → walk-up 이 실제 vault `.maencof` 발견 → deny.
- ⚠️ **모델이 셸(`run_command echo`)로 우회**해 파일 수정 — 내 가드는 write_to_file/replace_file_content 만 deny, Bash 미차단. **이는 전 호스트 공통 guardrail 한계**(OpenAI 공식 문서: "Codex can often perform equivalent work through another supported tool path"; Claude 도 Bash `echo>file` 로 우회 가능). ⇒ **agy = Claude 파리티**(차단 가드는 주 경로만 막고 셸 우회는 어디서나 가능).

> ⚠ **안전 사고·복구**: 혼란한 agy 모델이 테스트 vault 대신 **사용자 실제 vault(falias·tirnanog)의 01_Core/identity.md** 를 찾아 셸로 수정함. 즉시 `git checkout` 으로 **복원 완료**(git clean 확인). 교훈: **라이브 agy 파일-쓰기 테스트는 모델이 실제 파일에 도달하므로 위험** — 이후 read-only 로 한정.

### F7 정정 — `agy plugin install` 은 `bridge/` 를 복사한다

D1 로그의 "agy plugin install 은 bridge/ 미복사" 는 **틀렸다**(agy 1.1.2 실측: install 위치 `~/.gemini/config/plugins/<n>/bridge/` 에 번들 복사 확인). ⇒ **emitter 의 상대경로(`node bridge/run-agy.mjs …`)가 `agy plugin install` 로 작동** — 배포 블로커 해소.

### 조사 (공식/커뮤니티 — 내 접근 검증)

- **OpenAI 공식 훅 문서**(learn.chatgpt.com/docs/hooks): Codex PreToolUse `tool_name:"apply_patch"`·`tool_input.command`·`Bash`, deny 차단 — **내 E2/E3 실측과 일치**. **PreToolUse `additionalContext` 는 "parsed but not applied"**(issue #19385) ⇒ **filid 구조경고·maencof vault redirect 권고는 Codex 에서도 손실**(agy 와 동일 — 전 비-Claude 호스트에서 차단만 이식, 주입/권고 불가).
- **`falcosecurity/prempti`**: `tool_input.command` 에서 apply_patch 파싱, **다중 파일은 경로당 1 이벤트** — 내 파서 접근 검증 + 다중파일 상한의 업그레이드 경로(참조 구현).
- agy Medium 가이드·Reddit: PreToolUse `{decision:deny}` 차단 실증 — 내 D1b 확증.

### Emitter — validated·unblocked, 유예 (다음 단계)

라이브로 설계 전체가 검증됐고(체인·deny·F6·bridge 복사) 블로커도 없다. 배선만 남음: compiler `buildAgyHooks`(Claude PreToolUse → agy named-group, `*` matcher, `node bridge/run-agy.mjs PreToolUse bridge/pre-tool-use.mjs`) + **PreToolUse 보유 3개 플러그인(filid·imbas·maencof)** 의 build-hooks 에 `bridge/run-agy.mjs`(cross-platform agyRunner main) 번들 + `package.json:files` + baseline 30→33 + DETAIL + Claude 무영향(루트 hooks.json) 재확인. build-hooks 는 이벤트별 캡·금지패턴 가드가 정교해 신중히 다뤄야 함 — 별도 집중 세션 권장.

## 결론 요약

| 항목                     | 결과                                                                                 | 코드       |
| ------------------------ | ------------------------------------------------------------------------------------ | ---------- |
| E2/E3 Codex 파일도구     | ✅ apply_patch→Write/Edit 정규화, 가드 발화 실측 (공식 문서·prempti 검증)            | `16a161cc` |
| D1b agy 게이팅           | ✅ 번역 + **라이브 agy deny 강제 실측** + 가드 발화                                  | `85fea062` |
| F6 workspacePaths        | ✅ 편집 파일 경로로 cwd 역산 + walk-up — **라이브 실측**(빈 workspace 에서 deny)     | `6c75b159` |
| 셸 우회 (전 호스트 공통) | ⚠️ 모델이 Bash 로 우회 — guardrail 한계, Claude·Codex·agy 동일(고지)                 | (문서)     |
| Codex root hooks.json    | ✅ 안전(무시) · F7: agy install 이 bridge 복사 — emitter 설계·배포 확정              | (문서)     |
| Emitter 배선             | ⬜ 유예 — **validated·unblocked**, 3플러그인 build-hooks + baseline (별도 집중 세션) | 다음       |
