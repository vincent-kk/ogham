## Purpose

**레거시(deprecated) — 후속 구현은 `../antigravity/` 참조.**
gemini-cli 어댑터. 세션마다 격리된 `gemini-cwd/<sessionId>/` 작업 디렉토리를 만들고, UUID ↔ integer index 매핑을 매번 재해결.

## Structure

| File / Path           | Role                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| `modelAlias.ts`       | `high/mid/low` → gemini-cli alias (env override)                                                              |
| `sessionResolver/`    | `--list-sessions` 파싱 + UUID → integer index 매핑                                                            |
| `spawn.ts`            | `node:child_process.spawn('gemini', ...)` + env 주입                                                          |
| `geminiDispatcher.ts` | `Dispatcher<GeminiFlags>` 구현                                                                                |
| `utils/`              | `ensureCwd`, `buildPromptArgs`, `normalizeResponse`, `callGemini`, `captureSessionUuid`, `resolveResumeIndex` |
| `index.ts`            | `export { geminiDispatcher }` barrel                                                                          |

## Conventions

- env: `GEMINI_CLI_TRUST_WORKSPACE=true` 강제; sandbox ON+backend≠auto → `GEMINI_SANDBOX=<backend>`, OFF → `GEMINI_SANDBOX=false`
- `start`: `gemini [--yolo] [--sandbox] [-m <model>] -p "<prompt>"` → `--list-sessions` 로 UUID 캡처
- `resume`: UUID → integer index 해결 → `gemini --resume <index> [--yolo] [--sandbox] [-m] -p "<prompt>"`
- 권한 플래그(`yolo`/`sandbox`/`sandbox_backend`)는 `GeminiFlags` 채널; `externalSessionRef` 는 항상 UUID

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
- cennad `sessionId` 와 gemini UUID 를 혼동 — 항상 별개로 취급
- stdin 으로 prompt 전달 (v1 은 `-p` argv 만)

## Dependencies

- `node:child_process` (spawn), `node:fs/promises` (mkdir)
- `../envelope.ts`, `../errorMap.ts`
- `../../constants/paths.ts` (`geminiCwdPath`), `../../constants/defaults.ts` (`DIR_MODE`)
- `../../types/index.ts`
