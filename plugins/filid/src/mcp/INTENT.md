# mcp — Filid 1.0 protocol boundary

## Purpose

언어 중립 core를 4개의 action-dispatched MCP 도구로 노출한다. 이 계층은 입력 검증, artifact envelope와 host lifecycle만 소유한다.

## Structure

- 4개 도구 fractal은 `tools/` 아래로 모이고, 등록·envelope 직렬화·process lifecycle은 그 위 계층이 소유한다.
- 이름 함정: MCP executable entry는 서버 조립 디렉터리가 아니라 별도의 serverEntry child다.
- 브라우저에 서빙되는 정적 페이지도 이 계층 안에 살지만 TypeScript 소스를 import 하지 않는다.

## Conventions

- 모든 입력은 Zod로 검증하고 모든 출력은 공통 16 KiB artifact envelope를 쓴다.
- machine path는 정규화된 절대 경로, JSON은 compact serialization을 쓴다.
- `serverEntry/`는 build wiring만 가지며 core 판단을 구현하지 않는다.

## Boundaries

### Always do

- tool 결과에 status, 작은 summary와 diagnostics를 포함
- 큰 payload와 모든 restructure plan을 검증 가능한 ephemeral artifact로 저장
- structure·verification 판단을 core 공개 entry point에 위임

### Ask first

- 4개 도구 목록, action/input schema 또는 envelope budget 변경
- 프로젝트 파일을 쓰는 새 동작 추가

### Never do

- 범용 search/replace, AST 편집, 파일 이동, import rewrite 제공
- commit, push, PR 생성 또는 review fix 실행
- 언어 확장자·entry filename·test syntax를 MCP DTO에 추가

## Dependencies

- MCP SDK, Zod, `../core/`, `../adapters/`, host utility packages
