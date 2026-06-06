# agyModels — Antigravity 모델 목록 캐시

## Purpose

`agy models` CLI 출력을 실행·파싱·캐싱해 사용 가능한 Antigravity 모델 풀네임 목록을 제공한다. settings UI 드롭다운과 auto-tier 동적 모델 선택의 단일 소스. 네트워크·OAuth 의존이므로 실패 시 빈 배열로 graceful degrade 한다.

## Structure

| 파일                               | 역할                                                     |
| ---------------------------------- | -------------------------------------------------------- |
| `operations/getAvailableModels.ts` | 캐시 조회(TTL 1h) → miss/만료 시 refresh, stale fallback |
| `operations/refreshModels.ts`      | `spawnCli('agy', ['models'])` → 파싱 → 캐시 write        |
| `utils/parseModels.ts`             | stdout(JSON 또는 텍스트 테이블) → 모델명 `string[]`      |
| `index.ts`                         | barrel: `getAvailableModels`                             |

## Conventions

- 캐시 파일 `runtime/agy-models.json` (`{ models, fetched_at }`), TTL 1시간
- spawn/파싱/write 어떤 실패도 throw 금지 — 항상 `string[]` 반환
- 모델명 문자열은 가공 없이 보존 (`--model` 인자로 직결)
- 모든 write 는 `atomicWrite` 경유

## Boundaries

### Always do

- spawn 실패·타임아웃·비정상 종료 시 stale 캐시 또는 빈 배열 반환
- 캐시 write 실패를 무시하고 모델 목록은 정상 반환

### Ask first

- TTL·spawn 타임아웃 기본값 변경
- `agy models` 외 모델 조회 경로 추가

### Never do

- 모델 목록 부재를 에러로 전파 (UI·dispatch 는 목록 없이도 동작)
- 모델명 임의 정규화·필터 (tier 제약은 호출자 책임)

## Dependencies

- `@ogham/cross-platform` (`spawnCli`)
- `node:fs/promises`, `../../lib/atomicWrite`, `../../lib/logger`
- `../../constants/paths` (`AGY_MODELS_CACHE_PATH`), `../../utils/isFileNotFound`
- `../../types` (`AgyModelsCacheSchema` — 캐시 검증, types/ 재사용)
