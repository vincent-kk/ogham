# M2 호스트 실측 로그 (2026-07-15)

> 세션 작업 로그. 확정된 결론은 host-capability-matrix.md / migration-playbook.md / TODO.md 로 이관한다.
> 브랜치 `feature/issue-78-1`. codex-cli 0.144.4 · agy 1.1.2.

## 환경 사실 (확인됨)

- codex `/opt/homebrew/bin/codex` 0.144.4 · agy `~/.local/bin/agy` 1.1.2
- 어댑터: `.codex-plugin/plugin.json` ×10, 루트 `plugin.json` ×10, `mcp_config.json` ×9, `.agents/plugins/marketplace.json` ×1 — 전부 존재
- 이 체크아웃(ogham_mk2)이 어댑터 정본 — 마켓플레이스 등록은 여기서 해야 함 (main = `~/Workspace/ogham` 은 어댑터 없음, 가짜 PoC 위험)
- `~/.codex/config.toml` 세션 시작 상태 (ogham 미등록, 플러그인 미설치, `[hooks.state]` 없음)

## 측정 항목

| #    | 대상                                             | 상태 |
| ---- | ------------------------------------------------ | ---- |
| M2-1 | Codex imbas `project_root` 왕복 (V1)             | ⬜   |
| M2-2 | agy 모델 워크스페이스 경로 인지 (V2)             | ⬜   |
| M2-3 | agy MCP 프로세스 cwd·env (V3 선행)               | ⬜   |
| M2-4 | Codex r-statistics `run_r` E2E — contract.R (V4) | ⬜   |
| M2-5 | Codex AGENTS.md 규칙 주입 + 훅 판정 (C4)         | ⬜   |
| M2-6 | agy 지침 파일 정체 (C4/agy)                      | ⬜   |

## 발견 (잘못된 가설 / 잘못된 코드)

### F1. V1(틸데) 가설 부정확 — 모델은 `~`가 아니라 절대경로를 넘긴다

TODO M2-1 원안: "틸데가 이제 통과하므로 왕복이 1회 줄었다" — 전제는 *모델이 `~/…`를 넘긴다*였다.
실측(M2-1): Codex 모델은 **절대경로**(`/private/tmp/.../m2ws`)를 첫 호출에 그대로 넘겼다. `~` 미사용.
⇒ V1(틸데 전개)은 **방어적으로 옳지만**, "왕복 1회 절약"이라는 이득은 관측되지 않았다 — 이 모델은 애초에 절대경로를 넘겨 왕복이 0회다. 코드 수정 불필요, **문서의 이득 서술만 정정**.

## 원시 관측

### M2-1 (V1) — Codex imbas config_get · ✅ 코드 정상

프롬프트(중립): "What issue tracker is this project's imbas configuration set to? Use the imbas config_get MCP tool…"
워크스페이스 `--cd /private/tmp/.../m2ws` (플러그인 스냅샷과 구별되는 경로).

관측(`--json`):

- `mcp_tool_call server=imbas tool=config_get arguments={field:"provider", project_root:"/private/tmp/.../m2ws"}` — **첫 호출에 절대 워크스페이스 경로 자발 전달**
- 결과 즉시 성공(`value:"jira"`), **복구 왕복 0회**, throw 미발생
- token usage input 57k / output 340

결론: **projectRoot() 스키마 안내(`PROJECT_ROOT_ARG_DESCRIPTION`)가 충분히 동작**. 모델이 세션 cwd를 절대경로로 읽어 그대로 넘긴다. imbas 프로젝트 스코핑이 Codex에서 정상 작동.

### M2-4 (V4) — r-statistics run_r · Codex env 계약 직접 검증 · ✅ 코드 정상 (단 F2 결함)

Codex 헤드리스 `codex exec`는 **read-only 아닌 MCP 도구(run_r)를 승인 게이트로 선제 취소**한다("user cancelled MCP tool call") — read-only인 config_get은 자동 승인돼 정상 호출됐다(M2-1). run_r엔 `readOnlyHint`가 없어서다. `--sandbox`·`-c approval_policy` 로는 안 풀리고 `--dangerously-bypass-approvals-and-sandbox`가 필요한데 이는 auto 모드 분류기가 차단(정당). ⇒ **모델-facing 호출은 M2-1에서 이미 검증됐으므로**, run_r **코드**는 실제 설치 스냅샷 브리지를 Codex env 계약(cwd=스냅샷 루트 · `OGHAM_HOST=codex` · `CLAUDE_PLUGIN_ROOT` 부재)대로 스폰해 MCP 프로토콜로 직접 호출해 검증했다(`scratchpad/mcp-call.mjs`).

- **Case A** (데이터 없음, project_root 없음): `status=succeeded · exitCode=0 · manifest=present · stdout="[1] 3"`. **manifest 존재 = `.rstat_finalize` 실행 = contract.R 소싱 성공.** ⇒ `contractScriptPath()=pluginRoot()=cwd=스냅샷/shared/contract.R` 해석 확인. **예전 "run_r 파손"(폴백 `~/.claude/…` 부재)이 고쳐졌다.**
- **Case B** (dataRef=sample.csv + project_root=m2ws): `succeeded · manifest=present`. allow-root가 project_root로 해석돼 데이터가 수용·복사·finalize. `inputDataRoot()=projectRoot()` 확인.
- **Case C** (dataRef, project_root 없음): throw(`isError`). **그러나 메시지가 F2 참조.**
- **Control** (`OGHAM_HOST` 생략 = Claude 계약, dataRef, project_root 없음): allow-root=`process.cwd()` 사용(스냅샷) → sample.csv가 그 밖이라 `DATA_REF_OUTSIDE_ROOT`. **Claude 경로는 project_root 불요·cwd 사용 = 기존 동작 불변** 확인(무결손).

### F2. 잘못된 코드 — `resolveAllowedRoot`가 projectRoot()의 복구 안내를 삼킨다

`plugins/r-statistics/src/mcp/tools/runR/operations/resolveDataRefs.ts:20`

```ts
async function resolveAllowedRoot(): Promise<string> {
  try {
    return await realpath(inputDataRoot());
  } catch {
    // inputDataRoot()→projectRoot() throw 가 여기서 잡힘
    throw new Error(ERROR_MESSAGES.DATA_ROOT_INVALID);
  }
}
```

Codex에서 project_root 없이 run_r(+데이터) 호출 시, `projectRoot()`가 던지는 **"Cannot determine the project root on host codex. Retry the call with project_root set to…"** 안내가 이 catch에 삼켜져 **"R_STATISTICS_DATA_ROOT does not resolve to an existing directory"**(설정 못 하는 env 언급)로 바뀐다. V4가 심어둔 복구 경로(모델에게 project_root 재전달 유도)가 무력화된다.

**수정**: `inputDataRoot()` 호출을 try 밖으로 올려 projectRoot()의 안내가 전파되게 하고, realpath 실패만 DATA_ROOT_INVALID로 감싼다. Claude(=cwd, throw 없음)·잘못된 DATA_ROOT(realpath 실패→DATA_ROOT_INVALID 유지)는 불변. → 수정 단계에서 반영.

### M2-5 (C4) — Codex AGENTS.md 규칙/지침 채널 · ✅ 전부 정상

filid rule_docs_sync·maencof claudemd_merge 도 write 도구라 codex 헤드리스가 승인 게이트(M2-4 참조). 쓰기는 스냅샷 브리지 직접 호출로, 모델 프롬프트 도달은 `codex debug prompt-input`(승인 불요)으로 측정.

**filid 규칙 배포 (Codex 계약):**

- `rule_docs_sync action=sync path=<proj> selections={}` → **`<proj>/AGENTS.md` 병합**. 필수 규칙 `filid_fca-policy.md` copied, 나머지 unchanged(미선택). 마커 `<!-- FILID:START:filid_fca-policy.md -->`.
- **idempotence**: 재실행 후 9561B 그대로, 마커 구간 1개(중복 누적 없음).
- **모델 프롬프트 도달**: `codex debug prompt-input` 렌더 결과 `[3]/content[1]/text` 에 FCA-AI 규칙 본문 실림 — **AGENTS.md 병합분이 실제 모델 컨텍스트에 도달**. (예전 `.claude/rules/` 쓰기는 Codex가 안 읽어 무음 무효였음.)
- **훅 규칙 존재 판정**: 설치 스냅샷 `user-prompt-submit.mjs` 를 Codex 훅 계약(cwd=proj, `OGHAM_HOST` 부재)으로 실행 → `[filid] FCA-AI active. Rules: AGENTS.md` (합집합 읽기가 AGENTS.md 마커 발견, **오판 없음**). Control(미배포) → `Rules not deployed` 정확.

**maencof 지침 병합 (Codex 계약):**

- `claudemd_merge` → **vault `AGENTS.md`** 에 씀(CLAUDE.md 아님), `<!-- MAENCOF:START/END -->` 마커. `changed:true`. filid 와 **동일 `instructionsFile()`+마커 프리미티브** 사용, SessionStart 훅은 `instructionsPath` 합집합 읽기(코드 확인).

⇒ C4 전 경로(쓰기 채널 분기 · 모델 도달 · idempotence · 훅 합집합 읽기)가 filid·maencof 양쪽에서 Codex 검증 완료. **잘못된 코드 없음.**

---

## agy 축 (M2-2 · M2-3 · M2-6)

**환경 제약 (정직 고지)**: agy 1.1.2 로그에 `You are not logged into Antigravity` + `Entering local chrome mode! This is WRONG unless … eval mode`. CLI OAuth 토큰 부재 상태(Chrome/app 세션이 모델 접근 제공 — 응답은 정상 생성됨). 측정은 `agy --print`(비대화형) 기반 — 대화형 IDE 는 컨텍스트 주입이 다를 수 있다. 아래 결론은 **--print + 이 인증 상태** 범위로 한정한다. 근거는 model 행동이 아니라 **agy 가 저장한 transcript**(`brain/<conv>/…/transcript_full.jsonl`)의 주입 컨텍스트를 직접 판독해 확보(model-독립).

### F3(가설 정정) M2-6 — agy 는 지침 파일을 **자동 주입하지 않는다** (Claude/Codex 와 다름)

GEMINI.md·AGENTS.md·CLAUDE.md 에 각각 다른 코드워드를 심고 `agy --print` 로 질의:

- 파일읽기 **허용** 시 모델이 GEMINI·AGENTS 코드워드를 안다.
- 파일읽기 **금지** 시 셋 다 `NOTPRESENT`.
- transcript 판독: 모델이 **`grep_search`(Query="codeword")** 도구로 파일을 능동 검색해 얻었다(step 7→8). 주입 컨텍스트(step 0 USER_INPUT·step 2 SYSTEM EPHEMERAL)엔 **코드워드도 파일 내용도 없다**.

⇒ **agy(--print)는 GEMINI.md/AGENTS.md/CLAUDE.md 를 규칙으로 자동 주입하지 않는다.** Claude(CLAUDE.md 자동주입)·Codex(AGENTS.md 자동주입, M2-5 실측)와 근본적으로 다르다. rules.md 문서는 GEMINI/AGENTS 를 디렉터리 규칙으로 적지만, **실측은 --print 자동주입을 반증**한다.
⇒ **코드 결정: `instructionsChannel` 의 agy 분기를 업그레이드하지 않는다.** 현재 conservative(agy→claude 채널, "not claiming support we have not earned")가 **실측으로 정당화**됨. 대화형 주입이 확인되기 전엔 agy 지침 자동배포를 주장하지 않는다. **코드 변경 없음.**

### M2-2 — agy 는 워크스페이스 절대경로를 모델 컨텍스트에 주입하지 않는다

transcript: 절대 워크스페이스 경로가 주입 컨텍스트(step 0·1·2)엔 **없고**, 모델이 실행한 `pwd`의 **결과(step 4)**에서 처음 등장. agy 주입 메타데이터는 로컬시간·모델선택 변경뿐.
⇒ Codex(TUI 가 `directory:` 를 컨텍스트에 표시)와 달리 **agy 모델은 워크스페이스 경로를 `pwd`로 발견해야** 한다. 프로젝트 스코프 도구의 `project_root` 전달은 agy 에서도 가능하나 **pwd 발견 단계가 선행**(1스텝 추가, 모델 의존). 코드는 이미 선택 인자 방식이라 그대로 호환 — **코드 변경 없음.**

### M2-3 / V3 — agy 플러그인 자기파일(A좌표) 자기탐색 · ✅ 결정론적 확인 (인증 무관)

r-statistics 스냅샷 브리지를 **agy 계약**(OGHAM_HOST=agy · CLAUDE_PLUGIN_ROOT 부재 · **cwd=엉뚱한 임시 dir**)으로 스폰해 `run_r`(no data) 호출 → `succeeded · exitCode=0 · manifest=present · stdout="[1] 4"`. cwd 를 썼다면 contract.R 부재로 실패했을 텐데 성공 ⇒ **`pluginRoot()`→`locatePluginRoot()` 자기탐색이 실제 플러그인 루트를 찾았다.** V3 설계(cwd·env 미측정 호스트에서도 존재검증된 답)가 agy 에서 코드-레벨로 보증됨. (실제 agy MCP 프로세스의 cwd/env 측정은 미로그인·MCP 로딩의 대화형 의존으로 유예 — 단 **자기탐색이 이를 필요로 하지 않으므로 코드에 영향 없음**. TODO 도 M2-3 을 "이제 필수 아님"으로 명시.)

## 결론 요약

| #             | 결과                                                                                   | 코드 영향                           |
| ------------- | -------------------------------------------------------------------------------------- | ----------------------------------- |
| M2-1 (V1)     | Codex 모델이 `project_root`(절대경로) 첫 호출 자발 전달, 복구 0회                      | 없음 (틸데 이득 서술만 정정 — F1)   |
| M2-4 (V4)     | contract.R 소싱·allow-root 정상 (Case A/B), 가드 throw(C)                              | **F2 수정** (projectRoot 안내 삼킴) |
| M2-5 (C4)     | AGENTS.md 병합·모델 프롬프트 도달·idempotence·훅 합집합 판정 전부 정상 (filid·maencof) | 없음                                |
| M2-2 (agy)    | agy 는 워크스페이스 경로 미주입 (모델 pwd 발견)                                        | 없음 (선택 인자 호환)               |
| M2-3/V3 (agy) | 자기탐색이 플러그인 루트 정확 해석 (wrong cwd에서도)                                   | 없음 (설계 보증 확인)               |
| M2-6 (agy)    | agy(--print) 지침 파일 자동주입 안 함 → conservative 유지                              | 없음 (F3: 업그레이드 안 함)         |

**수정 대상: F2 (r-statistics resolveDataRefs) 1건.** F1·F3 는 문서/서술 정정.
