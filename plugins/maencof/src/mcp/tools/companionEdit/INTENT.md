# companionEdit

## Purpose

companion_edit 도구 핸들러. companion-identity.json 정본 편집(section add/update/remove, core 조정)의 유일한 허가 채널. preview/commit 2단계.

## Boundaries

### Always do

- 입력 Zod 스키마 검증(registration에서)
- core/companionEdit에 로직 위임

### Ask first

- 입출력 스키마 변경

### Never do

- 파일 I/O 직접 수행 (core/ 위임)
