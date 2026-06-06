# antigravity — Antigravity CLI(`agy`) 어댑터

## Purpose

Antigravity CLI(`agy`) 어댑터. 세션마다 격리된 `runtime/antigravity-cwd/<sessionId>/` 에서 `agy -p --output-format json` 실행, 응답·에러를 `DispatchResult` 로 정규화. agy 는 헤드리스 conversation id 미발급(Issue #7)이라 cwd 격리로 "최근 대화 = 이 세션" 보장.

## Structure

| File / Path   | Role                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------- |
| `operations/` | `modelAlias`(config map), `spawn`, `antigravityDispatcher`                                     |
| `utils/`      | `ensureCwd`·`buildStartArgs`·`buildResumeArgs`·`callAgy`·`parseJsonOutput`·`resolveTranscript` |
| `index.ts`    | `export { antigravityDispatcher }` barrel                                                      |

## Conventions

- `start`: `agy -p "<prompt>" --output-format json [--sandbox] [--dangerously-skip-permissions] [-m "<name>"]`
- `resume`: `agy --continue -p "<prompt>" ...` (cwd 격리 = 세션)
- 권한: `flags.sandbox`→`--sandbox`, `flags.skip_permissions`→`--dangerously-skip-permissions`
- 응답: json stdout 1차; 빈 stdout(Issue #76) 시 `resolveTranscript` 폴백
- 모델 풀네임은 config `model_map.antigravity` 단독; `externalSessionRef`=cwd

## Boundaries

### Always do

- antigravity-cwd 부재 시 `0o700` 생성; 모든 에러 `errorMap` 정규화
- 빈 stdout 시 transcript 폴백 후 실패면 Issue #76 cli_error

### Ask first

- `--output-format`·플래그 조합, `AntigravityFlags` 스키마 변경
- transcript 폴백 경로/형식 확정 (real-CLI 검증)

### Never do

- 하드코딩 model 문자열 (config `model_map` 만)
- agy 글로벌 세션·로그 파일 수정; stdin prompt 전달

## Dependencies

- `@ogham/cross-platform`(`spawnCli`,`normalizeEol`), `node:fs/promises`
- `../errorMap`, `../utils/computeIgnoredOptions`, `../../constants/{paths,defaults}`
- `../../types`, `../../lib/logger`
