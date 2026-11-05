# runIdGenerator — Contract

## Requirements

- 실행 ID는 로컬 날짜 `YYYYMMDD`와 최소 3자리 zero-padded 순번을 하이픈으로 연결한다. 순번은 999를 넘을 수 있으며 `20261105-1000`도 유효하다.
- 순번은 `runsDir` 의 기존 디렉터리 이름을 스캔해 오늘 날짜 접두사 중 최대값 + 1 로 정한다. 저장된 카운터를 두지 않는다 — 카운터 파일과 실제 디렉터리가 어긋나면 ID 가 충돌한다.
- `runsDir` 이 없으면 만든다. 상위 디렉터리 생성이나 조회 실패는 throw한다. 실행 디렉터리는 배타적으로 생성하며 `EEXIST`이면 다음 순번으로 재시도하고 그 밖의 생성 실패는 throw한다 — 충돌 가능성이 있는 ID는 반환하지 않는다.
- 날짜 8자리와 최소 3자리 숫자 순번 형식에 맞지 않는 항목은 무시한다.
- 알려진 한계: 디렉터리 예약 뒤 사본 생성이나 상태 저장이 실패하면 불완전한 실행 디렉터리가 남을 수 있다.

## API Contracts

- 반환값은 항상 `/^\d{8}-\d{3,}$/`를 만족하며 해당 실행 디렉터리는 이미 예약되어 있다.
- provider와 프로젝트 타입을 알지 못한다. 실행 디렉터리의 해석은 호출자가 담당한다.
- `sortRunIds`는 ID 형식에 맞지 않는 이름을 제외하고 날짜, 숫자 순번 순으로 오름차순 정렬한다. 조회 도구들은 이 비교를 공유하여 최신 실행과 목록 순서가 일치해야 한다.

## Boundary Exemptions

### `utils/sortRunIds.ts` — 조회 도구의 ID 정렬

- **Consumers**: `entry-point`
- **Direct import**: `not allowed`
- **Reason**: 실행 ID 형식과 순번 의미를 발급 모듈에서 함께 소유하여 생성·조회 규칙의 분산을 막는다. 조회 도구는 공개 표면으로 호출한다.

## Acceptance Criteria

### AC-runid-format — ID 형식

- 반환값이 `/^\d{8}-\d{3,}$/` 를 만족한다.
- 앞 8자리가 호출 시점의 로컬 날짜 `YYYYMMDD` 와 같다.

### AC-runid-tolerates-noise — 비정형 항목 무시

- `<today>-abc` 같은 항목이 있어도 throw 하지 않고 정상 순번을 반환한다.

## Last Updated

실행 ID 형식·발급 전제·실패 정책의 내용과 근거가 바뀔 때 갱신한다.
