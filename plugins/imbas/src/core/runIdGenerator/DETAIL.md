# runIdGenerator — Contract

## Requirements

- 실행 ID 형식은 `YYYYMMDD-NNN` 이다. 날짜는 로컬 시간 기준이고 `NNN` 은 3자리 zero-padded 순번이다.
- 순번은 `runsDir` 의 기존 디렉터리 이름을 스캔해 오늘 날짜 접두사 중 최대값 + 1 로 정한다. 저장된 카운터를 두지 않는다 — 카운터 파일과 실제 디렉터리가 어긋나면 ID 가 충돌한다.
- `runsDir` 이 없으면 만든다. 생성이나 조회가 실패하면 빈 목록으로 간주해 그날 첫 ID 를 돌려준다 — ID 발급이 디렉터리 상태 때문에 throw 하지 않는다.
- 접두사가 같아도 `NNN` 자리가 정수로 파싱되지 않는 항목은 무시한다.

## API Contracts

```typescript
export function generateRunId(runsDir: string): string;
```

- 동기 함수다. 반환값은 항상 `/^\d{8}-\d{3}$/` 를 만족한다.
- 이 fractal 은 프로젝트 타입이나 provider 를 모른다. `runsDir` 경로 해석은 `core/paths` 의 몫이다.

## Acceptance Criteria

### AC-runid-format — ID 형식

- 반환값이 `/^\d{8}-\d{3}$/` 를 만족한다.
- 앞 8자리가 호출 시점의 로컬 날짜 `YYYYMMDD` 와 같다.

### AC-runid-sequence — 순번 증가

- 빈 `runsDir` 에서 첫 호출이 `<today>-001` 을 반환한다.
- `<today>-001` · `<today>-002` 가 있는 `runsDir` 에서 `<today>-003` 을 반환한다.
- 다른 날짜 접두사 디렉터리는 순번에 영향을 주지 않는다.

### AC-runid-tolerates-noise — 비정형 항목 무시

- `<today>-abc` 같은 항목이 있어도 throw 하지 않고 정상 순번을 반환한다.

### AC-runid-missing-dir — 디렉터리 부재 허용

- 존재하지 않는 `runsDir` 로 호출해도 throw 하지 않고 `<today>-001` 을 반환한다.

## Last Updated

2026-08-06 — 디렉터리 스캔 기반 충돌 안전 ID 발급 계약을 최초 문서화했다.
