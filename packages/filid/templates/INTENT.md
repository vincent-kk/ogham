# templates — FCA-AI Template Assets

## Purpose

`filid-setup` 스킬이 프로젝트 초기 설정 시 사용하는 템플릿 파일을 포함한다. 훅 설정, 규칙 가이드, 산출물 매니페스트 등 정적 자산을 관리한다.

## Structure

| 경로 | 역할 |
|------|------|
| `deliverables.json` | `filid-setup` 산출물 매니페스트 (생성 파일 목록) |
| `hooks/` | Claude Code 훅 설정 템플릿 (hooks.json) |
| `rules/` | 규칙 문서 템플릿 + `manifest.json` (필수/선택 규칙 레지스트리) |

## Conventions

- 템플릿 파일은 대상 프로젝트에 복사되는 정적 파일
- `deliverables.json`은 `filid-setup`이 참조하는 산출물 목록
- `rules/manifest.json`이 주입 가능한 규칙 문서 목록을 선언 (`required` 필수, 나머지 opt-in)
- `rules/*.md`는 `filid-setup` 스킬 체크박스 결과에 따라 `.claude/rules/`로 복사됨 (세션 훅은 절대 건드리지 않음)

## Boundaries

### Always do

- 새 템플릿 추가 시 `deliverables.json`에 항목 추가
- 템플릿 내용 변경 시 `/filid:filid-setup` 스킬 문서 동기화

### Ask first

- 기존 템플릿 파일 경로 변경 (`filid-setup` / `mcp_t_project_init` 로직 수정 필요)
- 새 템플릿 카테고리 추가 (디렉토리 구조 확장)

### Never do

- 템플릿에 런타임 로직 포함 (정적 파일만)
- deliverables.json에 존재하지 않는 파일 참조
