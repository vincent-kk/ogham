# listModels — Antigravity 모델 목록 도구

## Purpose

`list_antigravity_models` MCP 도구. `core/agyModels` 가 캐싱한 `agy models` 목록을 `{ models: string[] }` 으로 반환한다. auto-tier dispatch 전 모델 선택, settings tier 매핑 검증, agy 가용성 확인에 사용. 입력 없음.

## Structure

| File            | Role                                                    |
| --------------- | ------------------------------------------------------- |
| `listModels.ts` | `handleListAntigravityModels` — getAvailableModels 위임 |
| `index.ts`      | barrel                                                  |

## Conventions

- 입력 인자 없음 (`inputSchema: {}`)
- 응답 `{ models: string[] }` — agy 미설치/미인증 시 빈 배열
- 모델 조회·캐싱은 `core/agyModels` 단독 책임 (이 도구는 위임만)

## Boundaries

### Always do

- 항상 `{ models }` 반환 — 실패 시 빈 배열 (throw 금지)
- 모델 목록은 `core/agyModels.getAvailableModels` 경유

### Ask first

- 응답 스키마 변경 (models 외 필드 추가) 또는 입력 인자 도입

### Never do

- `agy` 를 이 도구에서 직접 spawn (core/agyModels 만)
- 모델명 가공·필터

## Dependencies

- `../../../core/agyModels` — `getAvailableModels`
