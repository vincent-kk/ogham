# configManager — Contract

## Requirements

- 설정은 user(플러그인 데이터 디렉터리)와 project(`<workspace>/.atlassian/config.json`) 두 레이어이며 project 가 user 를 재정의한다 — 저장소 하나가 개인 기본값과 다른 사이트를 가리킬 수 있어야 하기 때문이다.
- **credentials 는 레이어링하지 않는다.** project 레이어는 워킹트리 안에 있어 비밀이 `git add .` 한 번 거리에 놓인다.
- 계층을 뭉개지 않고 구분해 다룬다: 병합된 유효 설정, 계층별 값과 재정의 상태, 두 계층의 경로를 각각 다른 함수가 답한다.
- 저장은 대상 계층을 명시해야 한다 — 기본 계층을 조용히 고르지 않는다.
- 계층 원시값의 좌표는 `@ogham/cross-platform/config-scope` 가 소유한다.
- 검증은 **병합 결과에만** 건다. project 레이어는 재정의한 키만 담아 단독으로 스키마를 통과할 수 없다. `saveConfig` 는 주어진 문서를 그대로 쓰고 병합 미리보기 검증은 호출자 몫이다.
- 두 레이어 모두 `0o600` 으로 쓰고, project 디렉터리를 만들 때 `.gitignore` 를 동봉한다.
- 설정 파일 부재는 빈 기본값으로 다루고 그 밖의 오류는 상위로 전파한다.
- `mergeConfig` 는 **레이어 병합이 아니다** — 한 문서 안의 얕은 patch 이며, 병합 후 스키마 파싱으로 유효성을 다시 확인한다.
- Win32 에서 `chmod 0o600` 은 no-op 이다. 파일 보호는 플러그인 데이터 디렉터리의 NTFS ACL 이 담당하며, 이 사실은 README Security 절로 안내한다.

## API Contracts

- `loadConfig(...)` — 병합된 유효 설정.
- `loadConfigByScope(...)` · `loadConfigScope(...)` — 계층별 값과 재정의 상태(`ConfigByScope`).
- `saveConfig(...)` — 명시된 한 계층에만 기록.
- `mergeConfig(...)` — 두 계층 병합 규칙.
- `configLayers(...)` — 두 계층의 파일 경로.

## Acceptance Criteria

### AC-layer-precedence — 계층 우선순위

- project 값이 user 값을 키 단위로 재정의한다.
- 저장이 지정된 계층 파일만 바꾼다.

### AC-credentials-not-layered — 자격증명 비레이어링

- credentials 가 project 레이어에 기록되지 않는다.

### AC-schema-validation — 스키마 검증

- 설정 검증이 `types/` 의 Zod 스키마로 수행된다.

## Last Updated

2026-07-30 — 두 계층 설정과 자격증명 분리 계약을 문서화했다.
