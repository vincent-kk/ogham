# companionEdit

## Purpose

companion_edit 도구 핸들러. companion-identity.json 정본 편집(section add/update/remove, core 조정)의 유일한 허가 채널. preview/commit 2단계.

## Conventions

companion identity 변경은 이 도구의 preview/commit 두 단계만 통과한다.

## Boundaries

### Always do

- core companionEdit에 위임하며 preview 순수성 유지

### Ask first

- 입출력 스키마 변경

### Never do

- 직접 파일 I/O로 core의 편집 경계를 우회
