# projectInit — config-only FCA initialization

## Purpose

Validate project path, output language, and optional adapter IDs; create only absent config v3 or persist a losslessly migrated v1/v2 file.

## Conventions

- 기존 config는 덮어쓰지 않고 생성 경로 요약만 반환한다.

## Boundaries

### Always do

- adapter ID와 language를 default config 생성에 전달
- rule document 배포는 `project_setup`의 `rules-sync` action에 남김

### Ask first

- initialization input 또는 overwrite 정책 변경

### Never do

- config schema를 로컬 재정의
- rule docs나 project source를 직접 쓰기

## Dependencies

- core configLoader public entry point
