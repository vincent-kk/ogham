## Purpose

entrez 플러그인의 TypeScript 소스 루트(프랙탈 루트). NCBI E-utilities 결정론 검색 엔진과 MCP 도구를 담는다. 유일한 닻은 검색 **누락 방지(recall)**.

## Conventions

- 모든 export는 각 프랙탈 배럴 `index.ts`를 통해 노출, ESM `.js` 확장자 import.
- 의존성 단방향: mcp → adapters → core → httpClient → NCBI. 역방향 금지.
- 공유 문자열은 공통 enums·constants에서 가져오고, 모듈 전용 코드·메시지는 지역 상수로 소유해 불필요한 결합을 피한다.

## Boundaries

### Always do

- 새 모듈은 배럴 `index.ts`로 노출하고 프랙탈이면 INTENT.md 동반.
- zod 스키마는 `types/`에만 정의.

### Ask first

- 새 프랙탈 디렉토리 추가 또는 외부 의존성 추가.

### Never do

- credentials(`api_key`)를 MCP 응답·로그에 노출.
- 전역 가변 상태 사용 또는 `src/version.ts` 직접 수정(`version:sync`만).
