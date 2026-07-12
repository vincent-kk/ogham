## Purpose

도메인 무지(domain-agnostic) 실행 기반 레이어. 통계 의미를 모르고 "R 코드를 안전하게 실행하고 산출물을 모은다"만 책임진다. 4개 프랙탈로 분리: Rscript 런타임, 워크스페이스 격리, 명령/스크립트 게이트, 비동기 잡 레지스트리.

## Structure

| Fractal        | Role                                                 |
| -------------- | ---------------------------------------------------- |
| `rRuntime/`    | Rscript 탐색·spawn(shell:false)·UTF-8/CP949 디코딩   |
| `workspace/`   | temp 격리·아티팩트 수집(해시·정책)·세션 정리         |
| `commandGate/` | 금지 R 호출 정적 차단 + setup 설치 명령 화이트리스트 |
| `jobStore/`    | 비동기 R 잡 인메모리 생명주기 레지스트리             |
| `index.ts`     | barrel — 4 프랙탈 공개 API re-export                 |

## Conventions

- 각 프랙탈은 독립 Bounded Context: 서로의 internal 파일 직접 import 금지(배럴 경유)
- 실행 안전만 — 통계 정책(가정·기법 적합성)은 평가하지 않음
- 1함수 1파일(`operations/*.ts`), 공유 상태는 eponymous 파일

## Boundaries

### Always do

- 새 실행-안전 관심사는 해당 프랙탈에 배치
- 프랙탈 간 호출은 `index.ts` 배럴 경유

### Ask first

- 새 core 프랙탈 추가 (예: jobStore 외 신규 런타임 상태)

### Never do

- 통계 의미·도메인 어휘를 core 에 도입
- MCP 도구 핸들러 로직을 core 에 누설 (core 는 mcp 를 모름)

## Dependencies

- `../constants/*`, `../types/*`, `../utils/*`, `../lib/*`
- Node 빌트인 (`child_process`, `fs`, `crypto`, `path`)
