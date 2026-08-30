# templates — FCA-AI Template Assets

## Purpose

`setup` 스킬이 프로젝트 초기 설정 시 사용하는 템플릿 파일을 포함한다. 훅 설정, 규칙 가이드 등 정적 자산을 관리한다.

## Conventions

- 템플릿은 대상 프로젝트에 복사되는 정적 자산이며 배포 동작을 직접 수행하지 않는다.
- 규칙 manifest가 주입 가능한 문서와 필수 여부를 선언하고, 규칙 원본의 해시를 배포 계약으로 고정한다.
- 규칙 원본은 `setup`이 선택한 active project rule channel로만 배포하며 세션 훅은 배포에 관여하지 않는다.

## Boundaries

### Always do

- 템플릿 내용 변경 시 `/filid:setup` 스킬 문서 동기화

### Ask first

- 기존 템플릿 파일 경로 변경 (`setup` / `mcp__plugin_filid_tools__project_init` 로직 수정 필요)
- 새 템플릿 카테고리 추가 (디렉토리 구조 확장)

### Never do

- 템플릿에 런타임 로직 포함 (정적 파일만)
