# providers

## Purpose

이슈 트래커 프로바이더 추상화 레이어. 각 프로바이더별 파싱·변환 로직을 캡슐화.

## Structure

| Directory | Role |
|---|---|
| `github/` | GitHub Issues 프로바이더 — Links 파싱, 메타 블록 처리 |

## Conventions

- 각 프로바이더는 독립 fractal 노드 (`INTENT.md` + `index.ts` 배럴 필수)
- 프로바이더 함수는 순수 함수 우선 (no I/O, no side effects)
- 외부 공개 타입은 모두 `types/index.ts`가 아닌 각 프로바이더 barrel에서 re-export

## Boundaries

### Always do

- 새 프로바이더 추가 시 이 INTENT.md의 Structure 표 업데이트
- 프로바이더 내부 함수는 반드시 해당 프로바이더 index.ts를 통해 노출

### Ask first

- 프로바이더 간 공유 로직 추출 (LCA 원칙 검토 필요)
- 외부 의존성 추가

### Never do

- 프로바이더 내부 파일을 외부에서 직접 import
- I/O 또는 외부 상태에 의존하는 함수를 pure-function으로 분류
