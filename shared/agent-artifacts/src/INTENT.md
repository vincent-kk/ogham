## Purpose

`src/`는 `@ogham/agent-artifacts`의 공개 entry point와 범위·아티팩트별
프랙탈을 묶는다. `index.ts`는 구체 소유 파일의 공개 심벌만 재수출한다.

## Conventions

- 내부 구현은 루트 배럴을 역참조하지 않고 구체적인 sibling entry point를 쓴다.
- 공개 배럴은 wildcard나 default export 없이 심벌을 열거한다.
- 패키지 외부 소비자는 `@ogham/agent-artifacts` 루트만 import한다.

## Boundaries

### Always do

- 공개 계약 변경 시 루트 배럴의 이름 있는 재노출을 갱신한다.
- 프로덕션 소스의 시스템 작업은 cross-platform entry point를 사용한다.

### Ask first

- 새 루트 재수출 추가.

### Never do

- `index.ts`에 구현 선언 추가 또는 외부 소비자의 내부 파일 deep import.
- 프로덕션 파일에서 금지된 Node 시스템 모듈 직접 import.
