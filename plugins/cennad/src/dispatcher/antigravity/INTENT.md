# antigravity — Antigravity CLI(`agy`) 어댑터

## Purpose

Antigravity CLI(`agy`) 어댑터. 세션마다 격리된 `runtime/antigravity-cwd/<sessionId>/` 에서 `agy -p` 실행, 응답·에러를 `DispatchResult` 로 정규화. agy 는 `--print` 모드에서 conversation id 미노출(Issue #7)이라 cwd 격리로 "최근 대화 = 이 세션" 보장.

## Structure

| File / Path   | Role                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `operations/` | `modelAlias`(config map), `spawn`, `antigravityDispatcher`                                                          |
| `utils/`      | `ensureCwd`·`buildStartArgs`·`buildResumeArgs`·`callAgy`·`parseJsonOutput`·`resolveTranscript`·`agyTranscriptStore` |
| `index.ts`    | `export { antigravityDispatcher }` barrel                                                                           |

## Conventions

- `start`: `agy -p "<prompt>" [--dangerously-skip-permissions] [--model=<name>]`
- `resume`: `agy --continue -p "<prompt>" ...` (cwd 격리 = 세션)
- 권한: `flags.skip_permissions`→`--dangerously-skip-permissions`, `flags.sandbox`→`--sandbox` (config 기본 false)
- 응답: `parseJsonOutput` 가 stdout 파싱. 빈 stdout(agy #76: non-TTY 긴 응답에서 비결정적 드롭) 시 `resolveTranscript`→`agyTranscriptStore` 가 agy brain transcript 에서 읽기 전용 복구
- 모델 풀네임은 config `model_map.antigravity` 단독; `externalSessionRef`=cwd

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
