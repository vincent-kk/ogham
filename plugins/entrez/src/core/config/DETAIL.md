# config — Contract

## Requirements

- 비밀과 비밀 아닌 설정은 파일을 나눈다. `config.json` 은 tool·email 등 공개 설정, `credentials.json` 은 `api_key` 이며 항상 0o600 으로 기록한다.
- config 는 user·project 두 레이어이고 project 가 user 를 재정의한다 — 저장소 하나가 자기 tool 이름을 선언할 수 있어야 하기 때문이다.
- **credentials 는 레이어링하지 않는다.** project 레이어는 워킹트리 안에 있어 `api_key` 가 `git add .` 한 번 거리에 놓인다.
- config 검증은 병합 결과에만 건다. project 레이어는 재정의한 키만 담아 단독으로는 스키마를 통과할 수 없다. credentials 는 읽기·쓰기 모두 검증한다.
- project 디렉터리를 만들 때 `.gitignore` 를 함께 둔다.
- rate limit 은 키 유무로 정해진다 — 키 없으면 초당 3, 있으면 초당 10.

## API Contracts

- `loadConfig()` — 두 레이어를 병합해 돌려준다. 미설정이면 `null`, 파일 권한은 0o600 으로 강화한다.
- `loadConfigByScope(): ConfigByScope` — project 좌표를 끈 채 같은 로더로 얻는 레이어별 뷰.
- `loadConfigScope()` — 레이어별 원문 + 병합 결과 + 재정의 목록(설정 페이지용).
- `saveConfig(...)` — 단일 레이어에 0o600 으로 기록.
- `loadCredentials()` — 없으면 `{}`, 권한 0o600 강화.
- `saveCredentials(...)` — `api_key` 를 0o600 으로 기록.
- `resolveRateLimit(...): ResolvedRateLimit` — 키 유무로 초당 허용 횟수 판정.
- `configLayers()` — 두 레이어 좌표 해석.

## Acceptance Criteria

### AC-secret-separation — 비밀 분리

- `api_key` 는 `config.json` 에 기록되지 않는다.
- credentials 파일은 project 레이어를 갖지 않는다.
- credentials 파일 권한이 0o600 이다.

### AC-config-layering — 레이어 병합

- project 레이어가 user 레이어를 키 단위로 재정의한다.
- 검증은 병합 결과에만 적용되어, 부분 문서인 project 레이어가 단독 검증으로 거부되지 않는다.

### AC-rate-limit — 요청 상한

- 키가 없으면 초당 3, 있으면 초당 10 으로 판정한다.

## Last Updated

2026-07-30 — 설정·자격증명 분리와 레이어 계약을 문서화했다.
