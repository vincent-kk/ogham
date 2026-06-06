## Purpose

gemini-cli 어댑터. 세션마다 격리된 `~/.claude/plugins/cogair/runtime/gemini-cwd/<sessionId>/` 작업 디렉토리를 만들고, UUID ↔ integer index 매핑을 매번 재해결.

## Structure

| File / Path           | Role                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `modelAlias.ts`       | `high/mid/low/auto` → gemini-cli alias (env override)                                                         |
| `sessionResolver/`    | `--list-sessions` 출력 파싱 + UUID → 현재 integer index 매핑 (constants organ)                                |
| `spawn.ts`            | `node:child_process.spawn('gemini', ...)` + env 주입                                                          |
| `geminiDispatcher.ts` | `Dispatcher<GeminiFlags>` 구현 + `supportedOptions = new Set()`                                               |
| `utils/`              | `ensureCwd`, `buildPromptArgs`, `normalizeResponse`, `callGemini`, `captureSessionUuid`, `resolveResumeIndex` |
| `index.ts`            | `export { geminiDispatcher }` barrel                                                                          |

## Conventions

- env: `GEMINI_CLI_TRUST_WORKSPACE=true` 강제; sandbox ON+backend≠auto 시 `GEMINI_SANDBOX=<backend>`, sandbox OFF 시 `GEMINI_SANDBOX=false` (상속 env 무력화)
- 세션마다 cwd 격리: `gemini-cwd/<sessionId>/` 생성 후 그 안에서 spawn
- `start`: `gemini [--yolo] [--sandbox] [-m <model>] -p "<prompt>"` → 직후 `--list-sessions` 로 UUID 캡처
- `resume`: UUID → integer index 해결 → `gemini --resume <index> [--yolo] [--sandbox] [-m] -p "<prompt>"`
- 권한 플래그(`yolo`/`sandbox`/`sandbox_backend`)는 `GeminiFlags` 채널 — config 단독 결정
- `externalSessionRef` 는 항상 UUID (integer index 는 매번 재계산)

## Boundaries

### Always do

- gemini-cwd 디렉토리 부재 시 `0o700` 권한으로 생성
- resume 시 stored UUID 가 list 에 없으면 `unknown` 실패 (재시작 불가)
- list-sessions 실패 시 dispatch 도 실패 (외부 ref 추적 불가)

### Ask first

- `--output-format json` 도입
- `GeminiFlags` 스키마 또는 `supportedOptions` 화이트리스트 변경

### Never do

- gemini 의 글로벌 세션 인덱스 파일 조작
- cogair `sessionId` 와 gemini UUID 를 혼동 — 항상 별개로 취급
- stdin 으로 prompt 전달 (v1 은 `-p` argv 만)

## Dependencies

- `node:child_process` (spawn), `node:fs/promises` (mkdir)
- `../envelope.ts`, `../errorMap.ts`
- `../../constants/paths.ts` (`geminiCwdPath`), `../../constants/defaults.ts` (`DIR_MODE`)
- `../../types/index.ts`
