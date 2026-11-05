# runIdGenerator — Contract

## Requirements

- 실행 ID 형식은 `YYYYMMDD-NNN` 이다. 날짜는 로컬 시간 기준이고 `NNN` 은 3자리 zero-padded 순번이다.
- 순번은 `runsDir` 의 기존 디렉터리 이름을 스캔해 오늘 날짜 접두사 중 최대값 + 1 로 정한다. 저장된 카운터를 두지 않는다 — 카운터 파일과 실제 디렉터리가 어긋나면 ID 가 충돌한다.
- `runsDir` 이 없으면 만든다. 생성이나 조회가 실패하면 빈 목록으로 간주해 그날 첫 ID 를 돌려준다 — ID 발급이 디렉터리 상태 때문에 throw 하지 않는다.
- 접두사가 같아도 `NNN` 자리가 정수로 파싱되지 않는 항목은 무시한다.

## API Contracts

- 반환값은 항상 `/^\d{8}-\d{3}$/`를 만족한다.
- provider와 프로젝트 타입을 알지 못한다. 실행 디렉터리의 해석은 호출자가 담당한다.

## Acceptance Criteria

### AC-runid-format — ID 형식

- 반환값이 `/^\d{8}-\d{3}$/` 를 만족한다.
- 앞 8자리가 호출 시점의 로컬 날짜 `YYYYMMDD` 와 같다.

### AC-runid-tolerates-noise — 비정형 항목 무시

- `<today>-abc` 같은 항목이 있어도 throw 하지 않고 정상 순번을 반환한다.

## Last Updated

실행 ID 형식·발급 전제·실패 정책의 내용과 근거가 바뀔 때 갱신한다.
