# providers

## Purpose

이슈 트래커 프로바이더 추상화 레이어. 각 프로바이더별 파싱·변환 로직을 캡슐화.

## Conventions

- 각 프로바이더는 독립 fractal 노드 (`INTENT.md` + `index.ts` 배럴 필수)
- 프로바이더 함수는 순수 함수를 우선한다. 전방 호환을 위한 미지원 입력 경고는 허용하되 트래커 실행과 파일·네트워크·프로세스 I/O를 파서에 결합하지 않는다.
- 외부 공개 타입은 모두 `types/index.ts`가 아닌 각 프로바이더 barrel에서 re-export

## Boundaries

### Always do

- 새 프로바이더의 소유권과 공개 경계를 문서·배럴에 함께 반영하여 구현 추가가 공개 계약을 조용히 넓히지 않게 한다.
- 프로바이더 내부 함수는 반드시 해당 프로바이더 index.ts를 통해 노출

### Ask first

- 프로바이더 간 공유 로직 추출 (LCA 원칙 검토 필요)
- 외부 의존성 추가

### Never do

- 프로바이더 내부 파일을 외부에서 직접 import
- I/O 또는 외부 상태에 의존하는 함수를 pure-function으로 분류
