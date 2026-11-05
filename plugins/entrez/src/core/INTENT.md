## Purpose

결정론 검색 엔진의 기반 경계를 소유한다. 검색 누락 방지를 위한 하드 규칙은 LLM이 아닌 이 계층의 책임이다.

## Conventions

- 각 프랙탈은 `index.ts` 배럴 + `INTENT.md`. operations/는 1함수 1파일.
- 외부에서는 `core/index.ts` 배럴로 접근(외부 경계).

## Boundaries

### Always do

- 검색 하드 규칙(10k cap·POST·rate·dedup)을 결정론 코드로 구현.

### Ask first

- 새 core 프랙탈 추가.

### Never do

- mcp/adapters 등 상위 레이어 import(단방향). 인라인 문자열 리터럴.
