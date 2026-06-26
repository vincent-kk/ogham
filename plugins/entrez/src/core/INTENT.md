## Purpose

결정론 검색 엔진의 core 프랙탈 묶음. 네트워크(httpClient)·db 해석(sourceResolver)·설정(config) + (Phase 3) segmenter·union·espell·queryLint·searchJob. 검색 도메인 하드 규칙은 LLM이 아닌 이 계층이 소유한다.

## Structure

| 프랙탈                                                            | 역할                                          |
| ----------------------------------------------------------------- | --------------------------------------------- |
| `httpClient/`                                                     | 외부 HTTP 단일 통로(retry·429·auto-POST·SSRF) |
| `sourceResolver/`                                                 | `db` 해석·E-utility URL 조립                  |
| `config/`                                                         | config/credentials 로드·저장·rate 판정        |
| `union/` · `segmenter/` · `espell/` · `queryLint/` · `searchJob/` | (Phase 3) recall 엔진                         |

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

## Dependencies

- `../types` · `../constants` — 계약·상수
- `../lib` · `../utils` — 부속품(fileIo·logger·sha256·ip 등)
