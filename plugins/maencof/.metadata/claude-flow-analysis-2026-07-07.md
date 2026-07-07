# maencof 동작 흐름 분석 보고서 — Claude 관점 (2026-07-07)

플러그인이 Claude Code 세션에 주입·개입하는 전 흐름(훅 6종, MCP 도구 20종, 스킬/에이전트 계약)을 Claude 입장에서 추적하고, 막히거나 어색하거나 끊긴 지점 후보를 **수정 없이 테스트로 검증**한 결과. 기준 버전 v0.7.2 (`main` b9761b2e), vitest 전체 스위트 116 파일 / 1066 통과 상태에서 진행.

## 검증 방법

- **소스·산출물 이중 확인**: `src/` 판독 후, 커밋된 `bridge/*.mjs`·`bridge/mcp-server.cjs`를 직접 구동해 실측 (재빌드 시 바이트 동일 — 산출물 신선함).
- **훅 시뮬레이션**: 스크래치 픽스처 vault(5-Layer 문서 + `kg_build` 실빌드)에 대해 각 브리지에 실제 훅 stdin JSON을 주입하고 stdout/exit code를 관찰.
- **MCP 실호출**: `mcp-server.cjs`에 stdio JSON-RPC로 `tools/list`, `kg_build`, `create`, `kg_search`, `kg_context`, `context_cache_manage`, L1 `update` 게이트를 실측.
- **현장 증거**: 실사용 vault(tirnanog)의 메타 파일 존재 여부·집계 수치와 오류 로그(문서 본문은 열람하지 않음), 전역 `~/.claude/plugins/maencof/error-log.json`.
- **계약 대조**: Claude Code 훅 출력 계약은 저장소 자체 연구 문서 `.omc/research/maencof-v030-hook-schema.md`(공식 문서 인용, 2026-04-16)를 1차 기준으로 삼고, 현행 공식 문서(code.claude.com/docs/en/hooks, 2026-07-07 조회)로 P3·P4 관련 조항을 재확인함.

## 확정된 문제 (실측 근거 포함)

### P1. 대화 메타스킬(`<maencof-meta-skill>`) 주입이 조용히 죽어 있음 — 심각

- **증상**: SessionStart가 주입해야 할 dialogue discipline 메타프롬프트가 어떤 세션에도 주입되지 않는다.
- **원인**: `buildMetaSkillContext()`는 본문이 `META_SKILL_MAX_CHARS`(2500 코드포인트)를 넘으면 **조용히 skip**한다. 현재 `metaSkillBody.md`는 **2975 코드포인트(3003바이트)**.
- **실측**: 픽스처 vault에서 `bridge/session-start.mjs` 구동 → additionalContext에 `<l1-core-full>`은 있으나 `<maencof-meta-skill>` 부재.
- **회귀 시점**: `faafa69c`(2026-06-22, #74)에서 2474 → 3003바이트로 증가하며 한도 돌파. **그 이후 전 세션에서 기능 정지 상태**.
- **왜 못 잡았나**: 한도 초과가 오류도 경고도 없는 설계(silent skip)이고, 빌드 가드는 번들 바이트만 검사할 뿐 메타스킬 코드포인트 한도는 검사하지 않는다.
- **개선 방향**: ① 본문을 2500 이내로 압축하거나 한도를 상향. ② silent skip을 제거하고 초과 시 error-log + `systemMessage`로 표면화. ③ `build-hooks.mjs`에 코드포인트 한도 검사를 추가해 빌드 타임에 차단(재발 방지 — 이번처럼 무관한 PR에서 본문이 자라며 재회귀하는 것을 막는 유일한 지점).

### P2. PostToolUse activityRecorder가 도구명 불일치로 전면 무동작 — 심각

- **증상**: MCP write 도구 사용이 활동 로그(`.maencof-meta/activity/events/`)에 전혀 기록되지 않는다.
- **원인**: 오케스트레이터가 `input.tool_name`을 bare 이름 allowlist(`create`, `update`, …)와 비교하지만, Claude Code는 훅에 **full-form** `mcp__plugin_maencof_t__create`를 전달한다(공식 문서의 matcher 예시 `mcp__memory__create_entities`, 본 저장소 CLAUDE.md의 full-form 규약과 동일 논리). `TOOL_CATEGORY_MAP`도 bare 키라 이중으로 불일치.
- **실측**: `bridge/post-tool-use.mjs`에 full-form 입력 → 무기록. bare 입력 → `activity/events/2026-07-07.jsonl` 생성됨.
- **현장**: 실vault에 `activity/sessions/`(sessionStore 경로)는 축적돼 있으나 `activity/events/`는 **존재하지 않음** — 수개월 사용 중 한 번도 기록 안 됨.
- **여파**: `activity_read`는 항상 빈 결과, `/maencof:insight`·checkup류의 활동 기반 진단 데이터 소스 상실. P1과 같은 PR(#74)로 들어온 양대 기능이 나란히 죽어 있는 셈.
- **개선 방향**: 비교 시 full-form 정규화(`mcp__plugin_maencof_t__` 접두 제거 후 bare 비교, 또는 `endsWith` 매칭). `lifecycle.json` 사용자 matcher 문서에도 full-form 필요성 명시.

### P3. PreToolUse L1 가드의 차단 신호가 잘못된 계약 — 심각 (UX 데드엔드)

- **증상**: Claude가 `01_Core/` 파일에 Write/Edit를 시도하면 안내 없이 턴이 끊긴다.
- **원인**: 가드가 `{"continue": false, "reason": "…identity-guardian / confirm_l1 안내…"}`(exit 0)를 내보낸다. Claude Code 계약상 PreToolUse 차단은 `hookSpecificOutput.permissionDecision: "deny"` + `permissionDecisionReason`(Claude에게 표시)이고, `continue:false`는 **전체 처리 중단**("Claude stops processing entirely after the hook runs")이며 이때 사용자 채널은 `stopReason`뿐("Not shown to Claude") — top-level `reason`은 무시된다. 저장소 자체 연구 문서(§2)가 정확히 이 매핑을 명시하는데 구현이 따르지 않았다. 현행 문서(2026-07-07 조회) 재확인 결과 PreToolUse에는 legacy `decision:"block"` 형식조차 더 이상 문서화되어 있지 않아 `permissionDecision`이 유일한 차단 경로다.
- **실측**: `bridge/pre-tool-use.mjs`에 L1 Write 입력 → 정확히 `{"continue":false,"reason":…}` 형태 확인(`permissionDecision`/`decision` 부재). Stop 엔트리는 반대로 exit 2 + stderr로 올바르게 번역하고 있어 엔트리 간 비대칭.
- **여파**: 차단 자체는 되지만(과격한 방식), 정교하게 작성된 안내문(“identity-guardian로 영향 분석 → `update` + `confirm_l1`”)이 Claude에게 전달되지 않는다. CLAUDE.md 지시문은 “identity-guardian을 거치라”고만 하는데 그 에이전트는 쓰기 도구가 없는 분석 전용이므로, Claude가 실제 수정 경로(`update`+`change_reason`+`confirm_l1`)를 알 수 있는 유일한 통로는 MCP `update`가 돌려주는 오류 메시지뿐이다(이 경로는 정상 동작 실측).
- **개선 방향**: layerGuard 결과를 entry에서 `permissionDecision:"deny"` + `permissionDecisionReason`으로 번역(도구 호출만 거부하고 턴은 지속 → Claude가 즉시 올바른 경로로 우회 가능). `mergeHookOutput` 주석의 “차단 신호는 entry 책임” 계약을 실제로 PreToolUse entry에 구현.

### P4. SessionEnd Session Recap이 무효 채널로 출력 — 중간

- **증상**: CLAUDE.md가 약속하는 "[maencof] Session Recap 자동 출력"이 실제로는 어디에도 표시되지 않는다.
- **원인**: finalize가 recap을 top-level `message` 필드로 반환 → 자체 연구 문서 §1이 “top-level `message`는 모든 이벤트에서 조용히 버려짐”이라고 판정한 바로 그 필드. SessionEnd에서 Claude용 채널은 없고 사용자용은 `systemMessage`다.
- **실측**: `bridge/session-end.mjs` 구동 → `{"continue":true,"message":"[maencof] Session Recap…"}` 확인.
- **부수**: recap 말미 “To save this recap, run /maencof:remember” 권고는 세션이 끝나는 시점이라 실행 불가한 안내다(/clear 경유 종료가 아닌 한).
- **개선 방향**: 현행 문서(2026-07-07 조회)는 SessionEnd를 “No decision control. Used for side effects like logging or cleanup”으로 규정하므로 `systemMessage` 이관조차 표시가 보장되지 않는다. 확실한 채널은 두 가지 — ① recap을 **Stop 시점**으로 이동(현행 문서가 Stop의 `hookSpecificOutput.additionalContext`를 “non-error feedback that continues the conversation”으로 새로 지원 — 2026-04 연구 문서에는 없던 경로), ② 다음 SessionStart의 “Previous session summary”로 통합(이미 `getRecentSessionSummary` 채널 존재 — 중복 설계를 단일화할 기회). 아울러 lifecycleDispatcher가 Stop/SessionEnd에서 쓰는 `systemMessage`도 같은 이유로 재검토 대상이며, 판단 기준이던 `.omc/research/maencof-v030-hook-schema.md` 자체가 2026-04 기준이라 주기 재검증이 필요하다.

### P5. changelog-gate 마커가 영구 잔존 → 게이트가 vault당 1회용 — 중간

- **증상**: `/maencof:changelog`를 한 번 통과하면 이후 어떤 세션에서도 Stop 게이트가 다시 차단하지 않는다.
- **원인**: `.omc/.changelog-gate-passed`를 skill이 `touch`로 만들고, **삭제하는 코드가 런타임 어디에도 없다**(전 소스 grep). SKILL.md는 “does not persist across sessions”라고 주장하지만 구현이 없다.
- **실측**: 픽스처에서 감시 경로 변경 + 마커 부재 → exit 2 차단(정상). 마커 생성 후 **다른 session_id로 재실행해도 통과**. 실vault에도 마커가 현존 → 현재 게이트 무력화 상태.
- **개선 방향**: SessionStart(또는 SessionEnd)에서 마커 삭제, 혹은 마커에 session_id를 기록해 불일치 시 무시(migration.lock의 orphan-cleanup 패턴 재사용). SKILL.md Step 6도 vault 절대경로 미사용(`mkdir -p .omc`가 CWD 상대) — Step 1/5와 같은 `$VAULT` 패턴으로 통일 필요.

### P6. selfProbe 거짓 경고가 매 세션 Claude 컨텍스트를 오염 — 중간

- **증상**: 실환경에서 세션 시작마다 Claude에게 “[maencof] hook bootstrap diagnostic — some hooks may not work: CLAUDE_PLUGIN_ROOT not set” 경고가 주입되고, 전역 오류 로그가 계속 자란다(현재 18KB).
- **원인**: hooks.json의 `${CLAUDE_PLUGIN_ROOT}`는 **명령 문자열 치환**이라 훅 프로세스의 env에는 해당 변수가 없을 수 있다. selfProbe는 env 부재를 error로 승격하고, entry는 error가 있으면 무조건 경고를 additionalContext에 덧붙인다. 훅이 정상 작동 중인데도 “작동 안 할 수 있다”는 거짓 신호가 상시 주입된다.
- **실측**: env 제거 후 `bridge/session-start.mjs` 구동 → 경고 부착 확인. 현장 전역 로그에 self-probe 오류가 오늘까지 수십 건 누적.
- **부수**: `libs/run.cjs`의 stale-경로 fallback도 `process.env.CLAUDE_PLUGIN_ROOT`에 의존하므로 같은 이유로 실환경에서 무용지물일 수 있다.
- **개선 방향**: env 부재를 error가 아닌 정보 필드로 강등(node/git/PATH 실패만 경고 대상), 또는 `process.argv[1]`(브리지 경로)에서 plugin root를 역산. 전역 error-log 로테이션(크기 상한) 도입.

### P7. 훅 주입 턴 컨텍스트가 세션 내내 stale — 중간 (설계 절충 + 단절)

- **증상**: 세션 중 문서를 만들거나 수정해도 매 턴 주입되는 `<kg-core nodes=… layers=…>`와 L1 gist가 갱신되지 않는다.
- **원인**: turn-context 캐시의 갱신 트리거가 `context_cache_manage`(pin/unpin/refresh)와 “캐시 부재 시 최초 빌드”뿐. mutate 도구·백그라운드 rebuild·`kg_build` 성공 어디에서도 `writeTurnContext`를 호출하지 않는다.
- **실측**: `create` 성공(stale 1 적재) 후에도 turn-context `nodes="5"` 유지, 신규 문서 미표기. 반면 MCP 검색 경로는 같은 시점에 신규 문서를 반환(freshness guard + boot rebuild 동작 확인) — **훅이 보는 세계와 MCP가 보는 세계가 분리**된다. `context_cache_manage refresh` 실행 시에만 `nodes="6"`으로 갱신됨.
- **어색함**: 탈출구(refresh)가 존재하지만 어떤 도구 설명·`<kg-directive>`·스킬도 “mutate 후 refresh가 필요하다”를 Claude에게 알려주지 않는다. 또한 `cacheManager.ts` 주석은 상단에서 “per-vault, shared across sessions”, 하단에서 “session-scoped, 종료 시 폐기”로 자기모순(후자가 실동작).
- **개선 방향**: ① `kg_build` 성공과 backgroundRebuild finalize에서 turn-context 재빌드. ② 저비용 대안으로 mutate 응답에 stale 고지 또는 mutate side-effect에서 refresh 수행. ③ 주석 계약 단일화. SessionEnd 미발생(크래시) 시 stale 캐시가 다음 세션으로 이월되는 점도 ①이 자연 해소.

### P8. vault-committer의 index.lock 경합 — 낮음 (현장 재발 확인)

- **증상**: 자동 커밋이 `.git/index.lock` 충돌로 간헐 실패(현장 로그 9건, 최근 하루 4건).
- **원인**: `isIndexLocked` 사전 체크 후 add/commit 실행 — 체크와 실행 사이 경합(TOCTOU) 무방비, 재시도 없음. 다중 세션/외부 git 작업과 겹치면 실패.
- **평가**: 실패는 조용히 로그되고 다음 트리거에서 재시도되므로 피해는 제한적. 다만 반복 로그가 오류 로그의 신호 대 잡음비를 떨어뜨린다.
- **개선 방향**: 1–2회 짧은 backoff 재시도, 또는 lock 존재 시 “skip” 정보 로그로 강등.

## 어색함·드리프트 (경미하나 Claude를 오도)

- **D1. 문서-코드 경로 드리프트**: 패키지 CLAUDE.md가 가리키는 `src/hooks/eventDispatch/entries/`는 존재하지 않음(실제 `src/hooks/<event>/<event>.entry.ts`), `metaSkillBody.md` 위치도 `sessionStart/helpers/bootstrap/` 하위로 이동됨. `build-hooks.mjs` 주석의 “see src/hooks/eventDispatch”도 동반 드리프트.
- **D2. frontmatter 필수 필드 오기**: 루트 INTENT.md는 “`id`/`layer`/`created` 필수”라 하지만 실제 파서 요구는 `created`/`updated`/`tags`/`layer`(id 불요). 실측: `updated` 없는 픽스처가 전량 parse 실패(“updated: Required”). `templates/rules/frontmatter-required.md`가 정본과 일치하는 유일한 문서.
- **D3. `skip_patterns` 명명 역전**: vault-commit 설정 필드는 “match 시 skip”으로 문서화·명명됐지만 실동작은 **match 시에만 commit**(기본 `/clear`). 상수 주석 “bailing on `/clear`”도 실동작과 정반대. 동작이 의도(컨텍스트 소거 직전 커밋)로 보이므로 명명·주석 쪽을 고칠 사안.
- **D4. `kg_status` 자기서술 충돌**: 도구 설명은 “진단 전용 — 자율 LLM 사용 비권장”인데 스킬·에이전트 문서 31곳이 워크플로 필수 단계로 지시(checkup, memory-organizer Phase 1 등). Claude 입장에서 상충 신호.
- **D5. changelog SKILL.md 서술 불일치**: “게이트가 non-vault 디렉터리에서 fire할 수 있다”는 서술은 코드(`isMaencofVault` 게이트)와 불일치. 마커 생성 단계만 CWD 상대 경로 사용(P5 참조).
- **D6. companion 마이그레이션 예산 초과가 로그에만 매몰**: 현장 error-log에 “turn identity budget exceeded by 231 chars … adjust via companion_edit” — 사용자·Claude 어느 쪽에도 표면화되지 않는 실행 지침. 실vault는 지금도 턴 예산 231자 초과 상태(런타임 컷 없음 설계라 매 턴 그대로 주입). 마이그레이션 결과 경고는 SessionStart advisory로 승격할 가치.
- **D7. 세션 시작 정보의 이중 주입**: companion greeting/origin이 SessionStart(`<companion-identity-full>`+인사)와 첫 UserPromptSubmit(세션 컨텍스트의 Companion Identity 단락)에서 중복 주입.
- **D8. SessionStart `source` 미구분**: startup/resume/clear/compact를 구분하지 않아 resume 시 L1 전문이 대화에 재중복 주입된다(compact 후엔 오히려 바람직). `source` 인지 후 resume에서 L1 full 생략 고려.

## 문제없음으로 판정(오해였거나 정상 확인)

- **N1. 관심사 격리·병합 구조**: safeConcern/mergeHookOutput 골격은 견고. 전체 vitest 그린(116 파일/1066 통과).
- **N2. Stop 차단 경로**: exit 2 + stderr(Claude 가시) — 계약 부합 실측. 여섯 엔트리 중 유일하게 차단 번역을 구현한 곳.
- **N3. bridge 산출물 신선도**: 재빌드 결과가 커밋본과 바이트 동일 — “빌드 후 커밋” 규율 준수 확인.
- **N4. data-sources.json 부재 오류 의심**: 프로비저닝(2.8단계)이 검사(6단계)보다 먼저 파일을 생성하므로 정상 vault에서 오류 미발생 — 오해로 판정.
- **N5. L1 전량 주입 비대 우려**: 무상한 설계이나 실vault는 5문서 4,510바이트로 무해. gist 부재 L1의 `⚠ no gist` 폴백도 정상 동작. (L1이 커지는 미래를 위한 소프트 상한+경고는 고려 가치)
- **N6. MCP 읽기 경로 신선도**: 세션 경계를 넘는 변경은 boot walk + stale rebuild가 회수 — 신규 문서가 즉시 검색됨을 실측. 단 **외부에서 새로 만든 파일**은 스냅샷에 없어 walk가 못 잡는 설계(다음 kg_build에서 회수) — maencof-lens의 stale 경고가 뜨는 배경.
- **N7. L1 보호의 MCP 경로**: `update`의 change_reason/confirm_l1/gist 하드 게이트와 지침적 오류 메시지 정상 — L1 흐름의 문제는 P3(Write/Edit 인터셉트)에 국한.
- **N8. 캐시 수명 관리**: 세션 파일 prune(TTL 24h/10개 초과 시), 세션 종료 시 turn-context 삭제 실측 확인.

## 개선 우선순위 제안

| 순위 | 항목                               | 이유                                                            |
| ---- | ---------------------------------- | --------------------------------------------------------------- |
| 1    | P1 메타스킬 복구 + 빌드 가드       | 핵심 기능이 2주째 조용히 죽어 있음; 3줄 수정 + 가드로 재발 차단 |
| 2    | P2 activityRecorder full-form 매칭 | 기능 전면 사망; 수정 범위 작고 효과 즉시                        |
| 3    | P3 permissionDecision 전환         | L1 보호 UX 데드엔드 해소; 자체 연구 문서가 이미 정답 보유       |
| 4    | P4 recap 채널 + P5 마커 수명       | 약속된 사용자 가시 기능 2건 복원                                |
| 5    | P6 selfProbe 강등 + 로그 로테이션  | 매 세션 거짓 경고 제거(컨텍스트 위생)                           |
| 6    | P7 turn-context 갱신 트리거        | 정확성 개선; 설계 논의 필요(비용 대비 갱신 시점)                |
| 7    | D1–D8 문서·명명 정리               | Claude 오도 제거; 일괄 문서 PR로 처리 가능                      |

공통 패턴 두 가지가 근본 원인에 가깝다: ① **silent-skip/silent-log 설계가 과다** — 기능이 죽어도 신호가 없다(P1·P4·P5·P6·D6 공통). 훅의 “절대 세션을 막지 않는다” 원칙은 옳지만, 실패의 *표면화*까지 포기할 필요는 없다(systemMessage·SessionStart advisory·빌드 가드가 안전한 표면화 채널). ② **Claude Code 계약(훅 envelope·도구명)의 회귀 테스트 부재** — 자체 연구 문서가 정답을 알고 있는데 코드가 어긋나도 잡히지 않는다. `.omc/research/maencof-v030-hook-schema.md` §2 표를 스냅샷 테스트(각 entry의 차단/메시지 채널 shape 검증)로 옮기는 것을 권한다.

## 부록 — 재현 절차

스크래치 하네스(세션 스크래치패드 `scratchpad/`): `mk-vault.mjs`(픽스처 vault), `run-hook.mjs`(브리지 stdin 구동), `mcp-call.mjs`(stdio JSON-RPC), `measure-metaskill.mjs`(코드포인트 측정), `vault-field-stats.mjs`(현장 집계). 핵심 재현:

1. P1: `measure-metaskill.mjs <metaSkillBody.md> 2500` → `codePoints: 2975, skipped: true`; 픽스처 session-start 출력에 태그 부재.
2. P2: post-tool-use에 `tool_name: "mcp__plugin_maencof_t__create"` → 무기록 / `"create"` → 기록.
3. P3: pre-tool-use에 01_Core Write → stdout `{"continue":false,"reason":…}` (exit 0).
4. P4: session-end → stdout `{"continue":true,"message":"[maencof] Session Recap…"}`.
5. P5: stop(변경 있음) → exit 2; `touch .omc/.changelog-gate-passed` 후 다른 session_id로도 통과.
6. P7: `create` 후 turn-context `nodes="5"` 불변, `context_cache_manage refresh` 후 `nodes="6"`.
