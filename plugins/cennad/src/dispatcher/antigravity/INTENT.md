# antigravity — Antigravity CLI(`agy`) 어댑터

## Purpose

Antigravity CLI(`agy`) 어댑터. 세션마다 격리된 `runtime/antigravity-cwd/<sessionId>/` 에서 `agy -p` 실행, 응답·에러를 `DispatchResult` 로 정규화. stream-json 이 conversation id 를 노출하므로 그것을 `externalSessionRef` 로 기록해 resume 이 그 대화를 정확히 지목한다; id 를 못 얻은 세션(transcript 복구)만 cwd 격리에 기대 "최근 대화 = 이 세션"으로 재개하고, 이후 어느 턴에서든 스트림이 id 를 실어 주면 그 자리에서 ref 를 승격한다.

## Structure

| File / Path   | Role                                                                                                                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `operations/` | `modelAlias`(config map), `spawn`, `antigravityDispatcher`                                                                                                                                |
| `utils/`      | `ensureCwd`·`buildStartArgs`·`buildResumeArgs`·`printTimeout`·`callAgy`·`findAgyResult`·`findAgyConversationId`·`findAgyError`·`parseJsonOutput`·`resolveTranscript`·`agyTranscriptStore` |
| `index.ts`    | `export { antigravityDispatcher }` barrel                                                                                                                                                 |

## Conventions

- `start`: `agy -p "<prompt>" --output-format stream-json [--sandbox] [--dangerously-skip-permissions] [--model=<name>] --print-timeout <tier cap>`
- `resume`: ref 가 conversation id(UUID) 면 `agy --conversation <id> -p "<prompt>" ...`, 레거시 cwd ref 면 `agy --continue -p "<prompt>" ...`
- `--print-timeout` 은 항상 tier 의 hard cap(초)으로 부착 — agy 자체 기본 5분이 상위 tier 를 잘라내기 때문. stream-json 의 `step_update` 이벤트가 idle timeout 의 liveness 신호
- 권한: `flags.skip_permissions`→`--dangerously-skip-permissions`, `flags.sandbox`→`--sandbox` (config 기본 false)
- **stream-json 을 아는 agy 가 최소 요구사항** — `--output-format`·`--print-timeout` 을 모든 호출에 붙이므로 모르는 빌드는 arg 검사에서 종료(`cli_error`)한다. `parseJsonOutput` 의 단일 JSON·plain text 분기는 출력 형태 드리프트 대비 관용이며 구버전 지원이 아니다
- 응답: `parseJsonOutput` 가 stream-json 의 마지막 `event:"result"` (`result.status === 'SUCCESS'` 일 때 `result.response`) 를 읽는다. 스트림이 `status:"ERROR"` 를 실으면(exit 0 이어도) `findAgyError` 문구로 실패 처리하고, 빈 stdout(agy #76: non-TTY 긴 응답에서 비결정적 드롭) 일 때만 `resolveTranscript`→`agyTranscriptStore` 가 brain transcript 에서 읽기 전용 복구 — **마지막 USER_INPUT 이후의 DONE 응답만** 인정(그 앞의 것은 이전 턴 답변)
- 모델: agy 는 **완전한 이름 하나**만 받고 두 표기의 혼합을 거부한다 — `Gemini 3.6 Flash (High)` ok, `gemini-3.6-flash-high` ok, `gemini-3.6-flash` + `--effort high` ok, `gemini-3.6-flash-medium (High)` **거부**. `modelAlias` 는 이미 완전한 이름(괄호 포함, 또는 slug 인데 `AGY_VARIANT_SUFFIXES` 로 끝남)은 그대로 보내고, base 에 effort 를 이을 때는 base 표기를 따른다 — 표시명은 `base (Variant)`, slug 는 `base-variant`. `externalSessionRef` = conversation id, 없으면 cwd

## Boundaries

### Always do

- antigravity-cwd 부재 시 `0o700` 생성; 모든 에러 `errorMap` 정규화
- 빈 stdout 시 transcript 복구 시도 → 실패하면 cli_error 로 정규화

### Ask first

- 플래그 조합, `AntigravityFlags` 스키마 변경
- agy 데이터 경로·transcript 스키마 가정 변경 (비문서화 내부 구조)

### Never do

- 하드코딩 model 문자열 (config `model_map` 만)
- agy 글로벌 세션·로그·store 파일 **수정** (복구는 읽기 전용); stdin prompt 전달

## Dependencies

- `@ogham/cross-platform`(`spawnCli`,`normalizeEol`), `node:fs/promises`
- `../errorMap`, `../utils/computeIgnoredOptions`, `../../constants/{paths,defaults}`
- `../../types`, `../../lib/logger`
