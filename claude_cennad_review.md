# 코드 리뷰: `d079adb0` — feat(cennad): apex tier and liveness timeout enhancements

리뷰 대상 커밋: `d079adb0d959ae570f9cde914f1877dd7b7222fc`

## 검증 상태

| 오라클                       | 결과                                                     |
| ---------------------------- | -------------------------------------------------------- |
| `yarn typecheck`             | 통과                                                     |
| `npx eslint`                 | 통과                                                     |
| `yarn plugin:adapters:check` | 동기 상태                                                |
| prettier                     | 통과                                                     |
| `yarn test:run`              | `spawnCli` idle 테스트 flaky (5회 중 2회 실패) — 아래 14 |

지적 1·3·4·7·14는 실제 모듈을 실행한 출력으로 확인했고(**CONFIRMED**), 나머지는 호출 그래프 추적으로 도출했다(**PLAUSIBLE**).

---

## 1. `positiveMs`의 floor가 0을 만들어 config 전체를 폐기시킨다 — CONFIRMED

`plugins/cennad/src/core/configManager/utils/mergeTimeouts.ts:6`

`positiveMs`가 `raw > 0`인 값을 모두 통과시킨 뒤 `Math.floor`하므로 소수점 밀리초가 0이 되고, 이는 자기 자신의 zod 스키마가 거부하는 값이라 `loadConfig`가 사용자 config 전체를 폐기한다.

`config.json`에 `{"timeouts":{"idle_ms":0.5}}`가 있는 경우. 실제 모듈을 실행해 확인: `mergeTimeouts({idle_ms:0.5}).idle_ms === 0`이고 `TimeoutsConfigSchema.safeParse`는 `Number must be greater than 0`으로 실패한다. 이어서 `loadConfig.ts:42-47`이 `DEFAULT_CONFIG`를 반환하므로 `ratio`, `keywords`, `model_map`, `preamble`, `recency_factor`가 모든 dispatch에서 무시된다. 잘못된 config를 막으려고 존재하는 sanitizer가 오히려 잘못된 config를 만들어낸다.

## 2. stdout 무제한 누적 + 6시간 상한 → RangeError로 서버 사망 — PLAUSIBLE

`shared/cross-platform/src/spawn/spawnCli.ts:203`

`state.stdout`이 자식 프로세스 출력 전체를 `maxBuffer` 없이 하나의 JS 문자열로 누적하는데, 이 커밋이 동시에 claude·agy를 full stream-json transcript로 전환하고 실행 상한을 10분에서 6시간으로 올렸다.

`hard_cap_ms = 21_600_000` 하에서 `start_conversation(provider:'claude', tier:'apex')` 실행. `--output-format stream-json --verbose`가 모든 assistant/tool_use/tool_result 이벤트를 뿜으므로 `state.stdout += stdoutDecoder.write(chunk)`가 몇 시간 동안 증가하고 `SpawnOptions` 어디에도 상한이 없다. V8 최대 문자열 길이에 도달하면 `+=`가 stdout `'data'` 리스너 안에서 RangeError를 던지는데, 이는 Promise executor와 모든 `try/catch` 바깥이라 cennad MCP 서버 프로세스와 동시 실행 중인 모든 세션이 함께 죽는다. 그 전이라도 `settle()`이 버퍼 전체에 `normalizeEol`을 돌리고 `findResultEvent`가 다시 split하므로 피크에 전체 복사본 3개를 동시에 들고 있다.

## 3. `clampEffort` 대소문자 불일치로 effort가 최약체로 붕괴한다 — CONFIRMED

`plugins/cennad/src/mcp/pages/settings/scripts/app.js:109`

`AGY_EFFORT_SCALE`은 대문자 표기인데 이 커밋이 `parseAgyModel`에 추가한 slug 분기는 소문자 변형을 반환하므로, `clampEffort`의 `scale.indexOf`가 항상 `-1`을 내고 저장된 effort를 카탈로그의 마지막 변형으로 붕괴시킨다.

`app.js` 로직을 그대로 실행해 확인: ledger에 기록된 대로의 slug 카탈로그(`gemini-3-1-pro-high|-medium|-low`)에서 `agyEffortSet`은 `['high','medium','low']`를 반환하고 `clampEffort('High') → 'low'`, `clampEffort('Medium') → 'low'`, `clampEffort('Low') → 'low'`가 된다. 커밋 이전의 display-name 카탈로그에서는 셋 다 정상 왕복했다. 따라서 `/cennad:setup`을 열어 현재 모델의 slug 형태를 고른 사용자는 출시된 apex 기본값(`Gemini 3.1 Pro`, `High`)이 조용히 가장 약한 변형으로 바뀌고, apex·high·mid가 모두 같은 effort로 붕괴한다. 1029행의 `rank < 0` 조기 반환은 도달하지 않는다 — scale에 없는 것은 _저장된_ 값이 아니라 _집합_ 멤버이기 때문이다.

## 4. `isAgyStream`이 첫 줄만 보고 판정해 배너 한 줄에 무력화된다 — CONFIRMED

`plugins/cennad/src/dispatcher/antigravity/utils/isAgyStream.ts:16`

첫 번째 비공백 라인만 보고 양쪽 분기 모두 그 순회에서 반환하므로, 스트림 앞에 JSON이 아닌 한 줄만 있어도 가드가 무력화되고 `parseJsonOutput`이 원시 JSONL을 모델 답변으로 돌려준다.

실제 모듈 실행으로 확인: stdout이 `Warning: a new version of agy is available` 뒤에 result 이벤트가 `status:'ERROR'`인 정상 stream-json인 경우 → `isAgyStream`이 false 반환 → `parseJsonOutput`의 `JSON.parse`가 여러 줄 텍스트에서 예외 → `catch { return text }`가 JSONL 덩어리 전체를 반환. `callAgy`는 그 JSON 덤프를 response로 담아 `status:'success'`로 보고하고 transcript 복구는 건너뛴다. 새 가드의 주석이 스스로 막는다고 적어 놓은 바로 그 실패다.

## 5. codex의 exit 0 + `turn.failed`가 success로 새어나간다 — PLAUSIBLE

`plugins/cennad/src/dispatcher/codex/utils/dispatch.ts:65`

새로 추출한 `parsed.errorMessage`가 `failed` 분기에만 연결되어 있어, `turn.failed`를 보고하면서 exit code 0으로 끝난 codex 턴이 response `null`·이유 소실 상태로 success 처리된다.

codex가 `{type:'thread.started'}`, `{type:'error',message:"You've hit your usage limit."}`, `{type:'turn.failed',...}`를 내보내고 exit 0으로 끝나는 경우 — 또는 `existingRef`가 non-null이라 52행의 thread-id 가드가 걸릴 수 없는 모든 resume. `dispatch`가 `{status:'success', response:null, error:null}`을 반환하고, courier는 빈 provider 응답을 보고하는 반면 바로 이 커밋에서 추가된 `parseCodexStream`의 `errorMessage`는 버려진다. `exitCode !== 0` 경로만 이 값을 소비한다.

## 6. claude 실패 경로만 `cliMessage`가 누락돼 Unknown으로 오분류된다 — PLAUSIBLE

`plugins/cennad/src/dispatcher/claude/utils/dispatch.ts:40`

claude 실패 분기가 `cliMessage` 없이 `mapError`를 호출하고 stdout을 전혀 파싱하지 않는다. 같은 커밋이 claude를 stream-json으로 옮겨 실패 사유가 stdout result 이벤트에 들어가게 만들었는데도 — codex와 agy에서 고친 바로 그 구멍이다.

`claude -p`가 사용량 한도에 걸린 경우: exit 1, stderr 비어 있음, stdout에 `{"type":"result","is_error":true,"result":"Claude AI usage limit reached..."}`. 34행에서 `failed`가 true이므로 (9행에 이미 import된) `parseResult`가 호출되지 않는다. `mapError`는 `EXIT_CODE_MAP`에 없는 `exitCode` 1, 빈 stderr, `spawnError` 없음을 받아 `ErrorCode.Unknown` + `Unclassified failure.`를 낸다. codex는 `codex/utils/dispatch.ts:43`에서, agy는 `callAgy.ts:44`에서 `cliMessage`를 넘기는데 claude만 빠졌고, 새 `errorMapCliMessage.test.ts`는 codex 형태 입력만 커버한다.

## 7. `errorMap` 우선순위가 stderr로 `spawnError` 문구를 가린다 — CONFIRMED

`plugins/cennad/src/dispatcher/errorMap/errorMap.ts:16`

`reported = cliMessage || stderr || spawnMessage`가 부수적인 stderr를 `spawnError.message`보다 위에 두어, 새로 넣은 idle-vs-ceiling 타임아웃 문구는 stderr가 완전히 비었을 때만 드러난다. 게다가 `classify()`는 `spawnError.code`를 보기 전에 같은 stderr부터 검사한다.

실행으로 확인: `mapError({exitCode:-1, stderr:'Reading additional input from stdin...\n', spawnError: ETIMEDOUT 'agy produced no output for 600000ms — treated as stalled'})` → `message = 'Reading additional input from stdin...'`. 바로 이 커밋에서 codex는 항상 그 안내를 stderr에 남긴다고 문서화했으므로, 모든 codex 타임아웃이 어느 한도가 걸렸는지 대신 그 문구를 전달한다. stderr에 `429`나 `sign in`이 섞여 있으면 멈춘 프로세스에 대해 `classify`가 `rate_limit`/`auth`를 반환한다. 새로 추가된 테스트는 `stderr === ''` 경우만 커버한다.

## 8. `SCALE_CEILING_MS`가 r-statistics의 Windows 타임아웃을 3배 축소한다 — PLAUSIBLE

`shared/cross-platform/src/spawn/osTimeout.ts:11`

cennad의 분 단위 상한을 보호하려고 공유 패키지에 매직 상수 `SCALE_CEILING_MS = 60_000`을 추가하면서, 임계값 위의 다른 모든 소비자에서 Windows ×3 여유가 조용히 사라졌다.

`plugins/r-statistics/src/constants/defaults.ts`는 `DEFAULT_TIMEOUT_MS = 120_000`, `MAX_TIMEOUT_MS = 600_000`을 선언하고 둘 다 60_000 이상이며, `spawnRscript.ts:38`이 이를 그대로 `spawnCli`에 넘긴다. Windows에서 이전에는 360초/1800초가 되었지만 이 커밋 이후로는 정확히 120초/600초다. Rscript 콜드 스타트로 150초 걸리던 R 작업이 예전에는 완료됐지만 지금은 `TIMEOUT_MESSAGE`를 반환한다. r-statistics의 코드·상수·문서·테스트는 하나도 건드리지 않았으므로 이 회귀는 보이지 않고 R 문제로 오진될 것이다.

## 9. stderr가 idle 타이머를 재무장시켜 hard cap까지 방치된다 — PLAUSIBLE

`shared/cross-platform/src/spawn/spawnCli.ts:206`

`touchIdle`이 stdout뿐 아니라 stderr 청크에서도 호출되어, 멈춰 있으면서 stderr로만 떠드는 CLI는 idle 한도에 절대 걸리지 않고 이제 예전 10분 벽시계 대신 tier hard cap까지 돈다.

codex가 auth/permission 재시도 루프에 빠져 30초마다 `Retrying after 30s`를 stderr에 쓰는 경우. 청크마다 10분 idle 타이머가 재무장되어 절대 만료되지 않고, `createRetryStormDetector`는 `Retrying after` 마커 2개에서만 걸리며 codex에만 존재한다(agy·claude에는 대응물이 없다). 따라서 `tier:'mid'` `start_conversation`이 상한 3_600_000 ms 전부를 막고 apex에서는 21_600_000 ms를 막는다. 제거된 `spawn_timeout_ms`는 600_000 ms에서 죽였을 상황인데, 이제 MCP 도구 호출과 courier 서브에이전트를 몇 시간씩 붙잡는다.

## 10. 스킬이 tier를 항상 전송해 `default_tier` 설정이 무력화된다 — PLAUSIBLE

`plugins/cennad/skills/codex/SKILL.md:34` (antigravity·claude 스킬 동일)

세 provider 스킬 모두 courier 템플릿을 "tier: 사용자가 요청했을 때만"에서 `tier: <apex|high|mid|low>  # start only`로 바꿔, 이제 start에서 tier가 항상 전달되고 그 결과 `config.default_tier`가 주요 사용자 경로에서 도달 불가능해졌다.

`startConversation.ts:57`은 `input.tier ?? config.default_tier[input.provider]`를 읽으므로 `default_tier`는 tier가 생략됐을 때만 적용된다. `/cennad:codex`, `/cennad:antigravity`, `/cennad:claude`가 이제 항상 tier를 내보내므로, 같은 커밋이 `index.html` 125·385·651행에서 apex 옵션까지 추가한 provider별 "default tier" 라디오 그룹이 스킬 기반 대화에 전혀 영향을 주지 않는다. 기본 tier를 low로 설정한 사용자도 스킬 rubric이 고른 값을 받는다. 예전 계약을 고정하던 acceptance assertion(`Omit unless the user asked`)이 재조준되지 않고 교체됐으며, 세 SKILL.md 모두 10행에서 여전히 `tier semantics lives in the courier`라고 말한다.

## 11. transcript 폴백이 이전 턴 답변을 새 답변으로 반환한다 — PLAUSIBLE

`plugins/cennad/src/dispatcher/antigravity/utils/callAgy.ts:55`

`parseJsonOutput`이 답변 없는 인식된 스트림에 대해 `null`을 반환하면서 그런 실행이 `resolveTranscript`로 흘러가는데, 이 경로는 stdout이 빈 경우만 문서화되어 있고 `readAgyTranscript`는 파일 mtime만 보고 대화 전체의 마지막 `DONE PLANNER_RESPONSE`를 반환한다.

antigravity 세션의 3번째 턴을 resume하는 상황. agy가 `status:'ERROR'`인 result 이벤트(또는 response가 빈 SUCCESS)를 내고 exit 0으로 끝난다. `parseJsonOutput → null`이므로 `resolveTranscript`가 brain transcript를 읽는데, mtime은 신선하지만(agy가 이번 턴 `USER_INPUT`을 append했다) 마지막 `DONE PLANNER_RESPONSE`는 2번째 턴 것이다 — `agyTranscriptStore.ts:62`가 `if (info.mtimeMs < since) return null`뿐이고 턴 단위 검사가 없다. `callAgy`는 `{status:'success', response: 2번째 턴 답변}`을 반환한다. 사용자는 새 프롬프트에 대한 답변인 것처럼 제시된 낡은 답변을 받는다.

## 12. abort 후 idle 타임아웃 발화로 결과가 오라벨되고 타이머가 샌다 — PLAUSIBLE

`shared/cross-platform/src/spawn/spawnCli.ts:113`

`onAbort`와 stderr-abort 경로가 `handle.idleTimer`를 clear하지도, `fireTimeout`이 검사하는 어떤 값을 세우지도 않는다(`fireTimeout`은 `settled || timedOut`만 본다). 그래서 대기 중이던 idle 타임아웃이 abort 뒤에 발화해 결과 라벨을 덮어쓰고 첫 settle 타이머를 고아로 만든다.

codex의 `createRetryStormDetector`가 stderr에서 true를 반환: `abortedByCaller = true`, 자식은 SIGKILL, settle 타이머 A가 1000 ms로 무장된다. `handle.idleTimer`는 여전히 무장 상태이고, 그 구간에서 만료되면 `fireTimeout`이 `timedOut = true`·`timeoutKind = 'idle'`로 세우고 `state.timeoutSettleTimer`를 타이머 B로 덮어쓴다. `settle()`은 B만 clear하므로 A가 남아 이벤트 루프를 붙잡는다. `spawnCodex`는 `spawn.ts:32`에서 `if (result.timedOut)`을 `:47`의 `if (result.abortedByCaller)`보다 먼저 검사하므로, `classify`가 `rate_limit`으로 매핑하는 재시도 폭주가 사용자에게는 네트워크 타임아웃으로 보고된다.

## 13. agy legacy 폴백이 도달 불가인데 테스트 fake가 이를 은폐한다 — PLAUSIBLE

`plugins/cennad/src/dispatcher/antigravity/utils/buildStartArgs.ts:12`

`--output-format stream-json`과 `--print-timeout`이 이제 모든 agy start·resume에 무조건 붙어, INTENT.md·DETAIL.md·`parseJsonOutput`이 모두 구버전 agy용으로 약속한 plain-text/단일 JSON 폴백이 도달 불가능해졌고, 통합 fake는 이를 가리도록 수정됐다.

legacy 파싱 경로가 필요할 만큼 오래된 agy 빌드는 `--output-format`을 모른다. 자체 arg 검사가 `flags provided but not defined: --output-format`을 찍고 0이 아닌 코드로 종료하므로 `classify`가 `cli_error`로 매핑하고 `parseJsonOutput`에는 도달조차 하지 않는다. 새 테스트 `still reads plain-text stdout from an agy build without stream-json`은 이를 잡을 수 없다 — 같은 커밋에서 fake의 `allowed` 집합에 `--output-format`과 `--print-timeout`이 추가되어, mode `legacy-text`가 stream-json을 받아들이고 무시하는 빌드, 즉 존재하지 않는 빌드를 모델링한다. 폴백은 지킬 수 없는 유지보수 약속을 달고 있는 죽은 코드다.

## 14. 새 idle 테스트가 flaky하고 Windows에서는 공허하다 — CONFIRMED

`shared/cross-platform/src/spawn/__tests__/spawnCli.test.ts:75`

`keeps a child alive past idleTimeoutMs while it keeps emitting`이 flaky하다. idle 카운트다운이 spawn 시점(`spawnCli.ts:187`)에 무장되므로 node 프로세스 기동 시간이 500 ms 예산에 먼저 청구되고, `heartbeat.mjs`의 첫 tick은 +100 ms에 온다.

이 머신에서 전체 스위트 5회 중 2회 실패 관측 — 항상 ~508 ms(정확히 idle 한도)에서 `expected true to be false`. 단독 실행에서는 통과하고 병렬 부하에서 실패하는데, 이는 정확히 CI의 조건이다: `.github/workflows/ci.yml:87`이 ubuntu-latest·macos-latest·windows-latest에서 `yarn test:run`을 돌린다. 별개로 Windows에서는 이 테스트가 공허하다 — `osTimeout(500)`이 5000 ms로 바닥 처리되는데 `heartbeat.mjs`는 ~1000 ms 후 종료하므로, `touchIdle`이 무엇을 리셋하든 실패할 수 없다.

## 15. `resume`이 `conversationId`를 버려 cwd ref를 승격시킬 수 없다 — PLAUSIBLE

`plugins/cennad/src/dispatcher/antigravity/operations/antigravityDispatcher.ts:93`

`resume()`이 `callResult.conversationId`를 버리고 `args.externalSessionRef`를 그대로 되돌려주므로, cwd ref를 기록한 세션은 이후 매 턴 스트림이 넘겨주는 conversation id로 절대 승격될 수 없다. 게다가 인접 주석은 `start()`가 하는 일과 정반대를 단언한다.

첫 턴이 transcript로 복구됐거나 구버전 agy에서 돌아 `externalSessionRef`에 격리 cwd가 저장된 세션. 이후 모든 resume이 스트림에서 실제 `conversation_id`를 파싱해 놓고 버리므로 `buildResumeArgs`가 계속 `--continue`를 내보내고, 이는 "해당 디렉터리의 가장 최근 대화"를 가리킨다. 그 cwd에서 다른 것이 한 번이라도 돌면 세션은 조용히, 영구적으로 다른 대화를 겨냥한다. 76-77행 주석(`ensureCwd(sessionId) is deterministic, so this equals the stored externalSessionRef that start() recorded`)은 64행 이후 생성된 모든 세션에 대해 거짓이며, 파일 안에서 cwd/ref 관계를 진술하는 유일한 문장이다.

---

## 상한에 밀렸지만 여전히 살아 있는 항목

- `callAgy`가 transcript 복구 경로에서도 `conversationId`를 반환해 자기 필드 주석·`antigravity/DETAIL.md`·`plugins/cennad/CLAUDE.md`("id가 없을 때만 격리 cwd를 사용")와 모순된다.
- `findAgyError`가 이미 import돼 있으면서도 exit-0 `status:'ERROR'` 경로에서 한 번도 참조되지 않는다.
- 레거시 `spawn_timeout_ms` 경고가 스키마 게이트 뒤 settings 전용 경로에 있어, 1분 상한이 30~360배로 넓어져도 아무 신호가 없다.
- settings의 분 단위 왕복이 폼이 표현하지 못하는 값을 조용히 재작성한다(20초 → 10분 기본값, 90초 → 120초, 48시간 상한 → 24시간). 게다가 폼에 `novalidate`가 걸려 있다.
- antigravity `high` 기본 effort가 High → Low로 내려가 `mid`의 Medium보다 약해졌는데, 도구 설명은 여전히 "Higher is stronger"라고 말한다.
- `mapError`의 새 `spawnError.message` 폴백이 절대 경로와 OS 사용자명을 노출할 수 있다.
- `README.md`와 `README-ko_kr.md`가 아직 3-tier로 문서화되어 있다.

## 정합성·재사용 테마 (정확성 컷 아래)

- `isRecord`를 이 diff가 6번 손으로 복제했다. 테스트된 공유 가드가 이미 둘 있다.
- JSONL 스캔 루프를 5번 새로 작성했다. `parseCodexStream`이 한 번에 해결한다.
- `callAgy`가 같은 stdout을 4~5회 순회한다.
- agy 이름 split/join이 서로 드리프트한 구현 3개로 존재하며, 그중 `mergeModelMap`의 `AGY_MODEL_VARIANT_RE`는 "keep in sync" 주석을 달고도 새 slug 규칙을 배우지 못했다.
- 5번째 tier 추가에 TS 쪽은 수작업 20여 곳이 필요했고, 이미 파생 구조인 `app.js` 쪽은 1곳이었다.

## 기존 문제로 판단해 제외

`mergeModelMap.test.ts` 18케이스, start 실패 후 무조건 실행되는 `createSession`, 커밋이 주변만 고치고 지나간 `antigravity/INTENT.md`의 낡은 `(config 기본 false)` 줄.
