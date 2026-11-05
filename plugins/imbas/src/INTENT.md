# src

## Purpose

imbas 플러그인 소스 코드 루트. 기획문서 재구조화·검증 → manday 추산 → 이슈 분할·생성 파이프라인의 결정론적 계층(상태머신·스키마 검증·설정) 구현.

## Conventions

- 설정은 user·project 두 계층이다 — configManager의 `loadConfig` 가 병합된 유효 설정을, `loadConfigByScope`·`loadConfigScope` 가 계층별 값과 재정의 상태를 준다.
- 계층에 쓰는 표면(`config_set` 도구, 설정 페이지 `/save`)은 `scope` 를 필수로 받는다. 기본값을 두면 프로젝트 결정이 사용자 파일에 들어가거나 그 반대가 된다.
- 설정 페이지 상태는 단일 `config` 가 아니라 `configByScope` 와 계층 문서·재정의 경로를 담은 `scope` 를 싣는다.
- 파이프라인 phase 는 `refine → estimate(skip 가능) → split` — 전이 규칙은 stateManager가 소유한다.

## Boundaries

### Always do

- 새 모듈 추가 시 types/index.ts 배럴에 타입 re-export 추가
- 상태·매니페스트 JSON은 lib/fileIo의 원자적 쓰기를, 설정 계층은 cross-platform의 원자적 계층 쓰기를 사용 — 중단된 쓰기로 저장 문서가 손상되지 않아야 한다.

### Ask first

- 새 디렉토리(fractal node) 추가
- 외부 의존성 추가

### Never do

- 영속 도메인 스키마를 types 밖에서 중복 정의 — 검증 규칙이 갈라지는 것을 막는다. MCP 등록 계층은 SDK에 광고할 전송 스키마를 정의하되 도메인 검증을 대체하지 않는다.
- 전역 상태(global mutable state) 사용
- 계층 경로 해석·병합 규칙 재구현 — `@ogham/cross-platform` 가 소유
