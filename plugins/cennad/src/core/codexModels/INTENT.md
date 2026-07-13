# codexModels — codex 모델 카탈로그 캐시

## Purpose

`codex debug models` 출력을 실행·파싱·캐싱해 사용 가능한 codex 모델과 각 모델이 광고하는 reasoning effort 집합을 제공한다. settings UI 드롭다운과 `/provider-status` 의 단일 소스. codex 는 모델이 광고하지 않은 effort 를 다운그레이드하지 않고 API 에러로 거부하므로, 모델과 effort 는 항상 짝으로 다룬다.

## Structure

| 파일                               | 역할                                                               |
| ---------------------------------- | ------------------------------------------------------------------ |
| `operations/getCodexModels.ts`     | 캐시 조회(TTL 1h) → 만료 시 refresh → stale → 정적 fallback        |
| `operations/refreshCodexModels.ts` | `codex debug models` spawn → 파싱 → 비빈 결과만 캐시 기록          |
| `utils/parseCodexModels.ts`        | 카탈로그 JSON → `{slug, efforts, default_effort?, description?}[]` |
| `index.ts`                         | barrel: `getCodexModels`                                           |

## Conventions

- 캐시 파일 `runtime/codex-models.json` (`{ models, fetched_at }`), TTL 1시간
- spawn·파싱·write 어떤 실패도 throw 금지 — 항상 `CodexModel[]` 반환
- 최종 fallback 은 빈 배열이 아니라 `constants/codexModels.ts` 의 정적 집합 (UI 가 항상 선택지를 갖도록)
- `visibility !== 'list'` 또는 `supported_in_api === false` 항목 제외 (내부 전용 모델)
- 카탈로그 순서(codex `priority`) 보존 — frontier 모델이 먼저
- 알 수 없는 effort 값은 필터; 남는 effort 가 없으면 그 모델 자체를 제외
- 모든 write 는 `atomicWrite` 경유

## Boundaries

### Always do

- spawn 실패·타임아웃·비정상 종료 시 stale 캐시 또는 정적 fallback 반환
- 빈 결과는 캐시 미기록 — 다음 호출에서 재시도
- 캐시 write 실패를 무시하고 모델 목록은 정상 반환

### Ask first

- TTL·spawn 타임아웃 기본값 변경
- `codex debug models` 외 카탈로그 조회 경로 추가 (`~/.codex/models_cache.json` 직접 읽기 등)

### Never do

- 카탈로그 부재를 에러로 전파 (UI·dispatch 는 카탈로그 없이도 동작)
- 모델별 effort 집합 임의 확장 — 미지원 effort 는 런타임 API 에러

## Dependencies

- `@ogham/cross-platform` (`spawnCli`)
- `node:fs/promises`, `../../lib/atomicWrite`, `../../lib/logger`
- `../../constants/{paths,codexModels}`
- `../../types` (`CodexModelsCacheSchema`, `CodexEffortSchema`)
