# projectInit — config-only FCA initialization

## Purpose

Validate project path, output language, and optional adapter IDs; create only absent config v3 or persist a losslessly migrated v1/v2 file.

## Conventions

- 기존 config를 새 기본값으로 대체하지 않는다. v1/v2는 key 손실 없이 v3 검증을 통과할 때만 변환 저장하여 사용자 선택이 초기화 과정에서 사라지지 않게 한다.

## Boundaries

### Always do

- adapter ID와 language를 default config 생성에 전달
- rule document 배포는 `project_setup`의 `rules-sync` action에 남김

### Ask first

- initialization input 또는 overwrite 정책 변경

### Never do

- config schema를 로컬 재정의
- rule docs나 project source를 직접 쓰기
