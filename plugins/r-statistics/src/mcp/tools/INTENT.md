## Purpose

MCP 도구 4종 프랙탈 모음. 도메인 무지·stateless 결정적 실행 레이어. 각 도구는 독립 프랙탈(`{tool}/{tool}.ts` 메인 + `operations/`)로, `createServer` 가 등록한다.

## Structure

| Fractal               | Tool                   | Role                                 |
| --------------------- | ---------------------- | ------------------------------------ |
| `runR/`               | `run-r`                | 크로스플랫폼 Rscript 실행 + 아티팩트 |
| `getRJob/`            | `get-r-job`            | async 잡 상태·결과 폴링              |
| `cancelRJob/`         | `cancel-r-job`         | 잡 취소                              |
| `assertAnalysisPlan/` | `assert-analysis-plan` | 통계 hard gate (결정론적)            |
| `index.ts`            | —                      | barrel — 핸들러 re-export            |

## Conventions

- 도구 등록명 snake_case, 심볼·파일 camelCase
- 핸들러는 평문 데이터 반환 (wrapHandler 가 JSON 직렬화)
- 1함수1파일 operations, 도구 간 직접 import 금지 (core·shared 경유)

## Boundaries

### Always do

- 새 도구는 독립 프랙탈 + `index.ts` 배럴 + INTENT.md

### Ask first

- 도구 추가/이름 변경 (createServer·.mcp.json 영향)

### Never do

- 도구 핸들러에서 다른 도구 핸들러 직접 호출
- 통계 정책을 run-r 에, 실행을 assert 에 누설

## Dependencies

- `../../core`, `../../constants`, `../../types`, `../../lib`, `../../utils`
