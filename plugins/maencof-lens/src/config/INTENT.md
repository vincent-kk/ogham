## Purpose

`.maencof-lens/config.json` 설정 관리 모듈. 스키마 정의, 로드/저장, 기본값 상수를 포함한다.

## Structure

- `configLoader/` — 두 계층 설정 읽기/쓰기/기본값 생성 (`configLayers.ts` 가 계층 경로 해석)
- `configSchema/` — Zod 기반 스키마 및 타입 정의
- `defaults/` — 기본값 상수 (레이어, 디렉토리명, 파일명, 버전)

## Conventions

- 설정은 user·project 두 계층이다 — `loadConfig` 는 병합된 유효 설정, `loadConfigScope` 는 계층별 원시 문서와 재정의 경로를 준다.
- `writeConfig` 는 대상 계층을 필수 인자로 받는다. 기본값을 두면 프로젝트 vault 목록이 개인 설정에 들어가거나 그 반대가 된다.
- project 계층은 `<projectRoot>/.maencof-lens/config.json` 자리를 그대로 지킨다 — 기존 체크아웃에 마이그레이션이 필요 없게 하기 위한 선택이다.

## Boundaries

### Always do

- 설정 변경 시 스키마 검증을 반드시 통과시킨다
- 모든 하위 모듈을 index.ts를 통해 재수출한다

### Ask first

- 설정 스키마 구조 변경
- 새로운 설정 필드 추가

### Never do

- 순환 의존성 도입
- 설정 파일에 직접 접근하지 않고 configLoader를 우회
- 계층 경로·병합 규칙을 이 모듈에서 재구현 — `@ogham/cross-platform` 가 소유

## Dependencies

- `@ogham/cross-platform` — `resolveConfigLayers`·`buildConfigScopeState` (계층 경로와 병합)
- `zod` — 설정 스키마 검증
