# projectInit — config-only FCA initialization

## Purpose

project path, output language와 optional adapter IDs를 검증해 부재한 config v2만 생성한다.

## Structure

- `projectInit.ts` — input boundary와 configLoader 호출
- `index.ts` — named tool export

## Conventions

- 기존 config는 덮어쓰지 않고 생성 경로 요약만 반환한다.

## Boundaries

### Always do

- adapter ID와 language를 default config 생성에 전달
- rule document 배포는 `rule_docs_sync`에 남김

### Ask first

- initialization input 또는 overwrite 정책 변경

### Never do

- config schema를 로컬 재정의
- rule docs나 project source를 직접 쓰기

## Dependencies

- core configLoader public entry point
