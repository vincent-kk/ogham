# providers — Contract

## Requirements

- 이슈 트래커별 파싱·변환 로직을 캡슐화하는 추상화 계층이다. 현재 구현체는 `github/` 하나다.
- 각 provider 는 독립 fractal 이다 — 자체 `INTENT.md` 와 `index.ts` 배럴을 갖는다. provider 내부 파일을 바깥에서 직접 import 하지 않는다.
- provider 함수는 순수 함수를 우선한다. 네트워크·파일·프로세스 I/O 는 이 계층에 두지 않는다 — 트래커 실행은 스킬 계층의 몫이다.
- provider 간 공유 로직을 성급히 추출하지 않는다. 두 번째 provider 가 생기기 전의 추출은 하나의 구현을 공용 계약으로 착각한 것이다.

## API Contracts

- provider 공개 타입은 해당 provider의 진입점이 소유한다. 전역 타입 배럴로 올리면 provider 경계가 사라진다.
- 이름별 재노출로 공개 계약을 고정한다. 내부 추가가 상위 공개 표면을 조용히 넓히지 않아야 한다.
- 새 provider를 더할 때 INTENT의 Structure 표와 배럴을 함께 갱신한다.

## Acceptance Criteria

### AC-providers-named-reexport — 명시 재노출

- `providers/index.ts` 에 `export *` 형태가 없다.
- 배럴이 노출하는 심볼이 각 provider 배럴의 공개 심볼 부분집합이다.

### AC-providers-no-io — I/O 부재

- `providers/**` 가 `node:fs` · `node:child_process` · 네트워크 클라이언트를 import 하지 않는다.

### AC-providers-boundary — provider 경계

- `providers/` 바깥의 파일이 `providers/<name>/` 내부 파일을 직접 import 하지 않는다.
- provider 하나가 다른 provider 디렉터리를 import 하지 않는다.

### AC-providers-structure-current — Structure 표 최신성

- `INTENT.md` 의 Structure 표에 나열된 디렉터리 집합이 실제 provider 디렉터리 집합과 같다.

## Last Updated

provider 간 격리·공개 타입·I/O 경계의 내용과 근거가 바뀔 때 갱신한다.
