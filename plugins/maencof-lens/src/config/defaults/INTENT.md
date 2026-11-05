## Purpose

설정 기본값을 config 경계에 재노출한다.

## Conventions

- 기본값의 정본은 `constants/config.ts`이며 이 모듈은 config 배럴의 재노출 경계다. 가드와 SessionStart 훅 구현은 이 모듈을 거치지 않고 정본을 직접 참조한다.

## Boundaries

### Always do

- 값은 정본 상수 파일에만 정의하고 이 모듈에서 다시 선언하지 않는다

### Ask first

- 공개 API 시그니처 변경
- 다른 모듈에 대한 새로운 의존성 추가

### Never do

- 순환 의존성 도입
- organ 경계를 넘는 직접 import
