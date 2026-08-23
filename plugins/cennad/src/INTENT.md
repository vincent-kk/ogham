## Purpose

`@ogham/cennad` 소스 루트. Claude 가 Codex / Antigravity / Claude CLI 에 자율 위임하도록 하는 MCP 서버, dispatcher, hooks, core 저장소를 모은 패키지 진입 모듈.

## Conventions

- ESM (`"type": "module"`), import 확장자 `.js`
- 디렉토리·파일 이름은 camelCase (organ `__tests__`, `__generated__` 예외)
- 디스크 JSON 키는 snake_case (외부 인터페이스 일관성)
- 공개 API 는 패키지 진입점에서 이름을 열거해 re-export
- 생성된 version 값은 `yarn version:sync` 로만 갱신

## Boundaries

### Always do

- 새 공개 모듈은 패키지 진입점에 명시적으로 export 추가
- 훅 계층은 `node:*` 빌트인만 사용 (zod / MCP SDK 금지)

### Ask first

- 새 하위 fractal 추가
- 공개 API 시그니처 변경

### Never do

- 생성된 version 값 직접 수정
- 훅 계층에서 core 또는 types 계층을 import (빌드 가드 위반)
- 순환 의존성 도입
