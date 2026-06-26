## Purpose

entrez 플러그인의 TypeScript 소스 루트(프랙탈 루트). NCBI E-utilities 결정론 검색 엔진과 MCP 도구 5종을 담는다. 유일한 닻은 검색 **누락 방지(recall)**.

## Structure

| 디렉토리           | 역할                                                                        |
| ------------------ | --------------------------------------------------------------------------- |
| `types/`           | enums(`as const`)·zod 스키마·`PaperRecord`·`SearchManifest`                 |
| `constants/`       | paths·defaults·messages (인라인 문자열 금지)                                |
| `core/`            | httpClient·sourceResolver·config·union·segmenter·espell·queryLint·searchJob |
| `adapters/eutils/` | E-utility 함수별 어댑터(1함수 1파일)                                        |
| `mcp/`             | MCP 서버 lifecycle + 도구 5종 + shared helpers                              |
| `lib/` · `utils/`  | 부속품(Organ) 격리 — atomicWrite·logger·xmlParse·sha256·isoNow              |

## Conventions

- 모든 export는 각 프랙탈 배럴 `index.ts`를 통해 노출, ESM `.js` 확장자 import.
- 의존성 단방향: mcp → adapters → core → httpClient → NCBI. 역방향 금지.
- 문자열 리터럴은 `types/enums.ts`·`constants/*`에서만(인라인 금지).

## Boundaries

### Always do

- 새 모듈은 배럴 `index.ts`로 노출하고 프랙탈이면 INTENT.md 동반.
- zod 스키마는 `types/`에만 정의.

### Ask first

- 새 프랙탈 디렉토리 추가 또는 외부 의존성 추가.

### Never do

- credentials(`api_key`)를 MCP 응답·로그에 노출.
- 전역 가변 상태 사용 또는 `src/version.ts` 직접 수정(`version:sync`만).

## Dependencies

- `@modelcontextprotocol/sdk` — MCP 서버 프레임워크
- `zod` — 런타임 스키마 검증
- `@ogham/cross-platform` — 경로·런처(subprocess 직접 호출 금지)
