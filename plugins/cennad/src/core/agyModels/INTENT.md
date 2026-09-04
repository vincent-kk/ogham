# agyModels — Antigravity 모델 목록 캐시

## Purpose

`agy models` CLI 출력을 실행·파싱·캐싱해 사용 가능한 Antigravity canonical model slug 목록을 제공한다. settings UI 드롭다운 및 provider-status 조회의 단일 소스. 네트워크·OAuth 의존이므로 실패 시 빈 배열로 graceful degrade 한다.

## Structure

| 파일                               | 역할                                                                |
| ---------------------------------- | ------------------------------------------------------------------- |
| `operations/getAvailableModels.ts` | 캐시 조회(TTL 1h) → miss/만료 시 refresh, stale fallback            |
| `operations/refreshModels.ts`      | `agy models` → stdout/stderr 파싱 → 비빈 결과만 캐시·빈 결과 재시도 |
| `utils/parseModels.ts`             | stdout(JSON/텍스트/테이블, ANSI strip) → canonical slug `string[]`  |
| `index.ts`                         | barrel: `getAvailableModels`                                        |

## Conventions

- 캐시 파일 `runtime/agy-models.json` (`{ models, fetched_at }`), TTL 1시간
- spawn/파싱/write 어떤 실패도 throw 금지 — 항상 `string[]` 반환
- 빈 결과(0개)는 캐시 금지 — stdout 비면 stderr 파싱, 그래도 비면 재시도(non-TTY stdout 드롭 대비)
- 탭 구분 행은 agy가 machine-readable 값으로 선언한 첫 slug 열만 보존하고 표시명 열은 버린다
- 모든 write 는 `atomicWrite` 경유

## Boundaries

### Always do

- spawn 실패·타임아웃·비정상 종료 시 stale 캐시 또는 빈 배열 반환
- 빈 모델 결과는 캐시 미기록 — stale 캐시 또는 다음 호출 재시도로 복구
- 캐시 write 실패를 무시하고 모델 목록은 정상 반환

### Ask first

- TTL·spawn 타임아웃 기본값 변경
- `agy models` 외 모델 조회 경로 추가

### Never do

- 모델 목록 부재를 에러로 전파 (UI·dispatch 는 목록 없이도 동작)
- agy가 출력한 slug 열 밖에서 모델명을 추측·하드코딩하거나 tier 제약을 적용

## Dependencies

- `@ogham/cross-platform` (`spawnCli`)
- `node:fs/promises`, `../../lib/atomicWrite`, `../../lib/logger`
- `../../constants/paths` (`AGY_MODELS_CACHE_PATH`), `../../utils/isFileNotFound`
- `../../types` (`AgyModelsCacheSchema` — 캐시 검증, types/ 재사용)
