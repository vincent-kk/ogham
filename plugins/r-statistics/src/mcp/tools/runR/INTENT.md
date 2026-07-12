## Purpose

`run_r` 도구 핸들러. LLM 이 생성한 R 코드를 격리 워크스페이스에서 헤드리스 Rscript 로 실행하고 아티팩트를 수집한다. 금지 호출 정적 차단 → 데이터 resolve → 실행계약 주입 → sync(대기)/async(폴링) 실행. 실행 안전만 — 통계 정책은 assert 소관.

## Structure

| File                               | Role                                                      |
| ---------------------------------- | --------------------------------------------------------- |
| `runR.ts`                          | 핸들러 — 검증·게이트·워크스페이스·잡 오케스트레이션       |
| `operations/buildWrapperScript.ts` | user 코드를 contract 헤더/푸터로 감싼 래퍼 R 소스 생성    |
| `operations/resolveDataRefs.ts`    | 입력 데이터 `data/` 복사 + `refs.json` 작성               |
| `operations/buildRunEnv.ts`        | child 프로세스 env(ARTIFACTS_DIR·SEED·CONTRACT 등) 구성   |
| `operations/executeRun.ts`         | spawn·디코딩·manifest·아티팩트 수집·상태 분류 → 결과 조립 |
| `index.ts`                         | barrel                                                    |

## Conventions

- 실행 전 `validateRScript` 정적 게이트 통과 필수 (실패 → `COMMAND_BLOCKED`)
- Rscript 미탐색 → `R_NOT_FOUND` (setup 안내)
- 기본 `executionMode=async` (jobId 반환 후 get_r_job 폴링), `sync` 는 즉시 결과
- 모든 잡은 jobStore 에 등록 (사전 실패도 synthetic 잡으로 일관 반환)

## Boundaries

### Always do

- `--vanilla` + temp 격리 + 명령 게이트로만 실행
- timeout 은 `MAX_TIMEOUT_MS` 로 clamp

### Ask first

- 입력 스키마(dataRefs/sessionMode) 변경
- 래퍼 주입 방식 변경

### Never do

- 통계 가정·기법 적합성 판단 (assert 소관)
- ARTIFACTS_DIR 밖 산출물 수용

## Dependencies

- `../../../core` (rRuntime·workspace·commandGate·jobStore), `../../../constants`, `../../../lib/atomicWrite`, `../../../types`, `../../../utils`
