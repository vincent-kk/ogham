# templates — FCA-AI Template Assets

## Purpose

fca-init 스킬이 프로젝트 초기화 시 복사하는 템플릿 파일을 포함한다. 훅 설정, 규칙 가이드, 산출물 매니페스트 등 정적 자산을 관리한다.

## Structure

| 경로 | 역할 |
|------|------|
| `deliverables.json` | fca-init 산출물 매니페스트 (생성 파일 목록) |
| `hooks/` | Claude Code 훅 설정 템플릿 (hooks.json) |
| `rules/` | FCA 규칙 가이드 템플릿 (fca.md → .claude/rules/) |

## Conventions

- 템플릿 파일은 대상 프로젝트에 복사되는 정적 파일
- `deliverables.json`은 fca-init이 참조하는 산출물 목록
- `rules/fca.md`는 `.claude/rules/fca.md`로 복사됨

## Boundaries

### Always do

- 새 템플릿 추가 시 `deliverables.json`에 항목 추가
- 템플릿 내용 변경 시 fca-init 스킬 문서 동기화

### Ask first

- 기존 템플릿 파일 경로 변경 (fca-init 로직 수정 필요)
- 새 템플릿 카테고리 추가 (디렉토리 구조 확장)

### Never do

- 템플릿에 런타임 로직 포함 (정적 파일만)
- deliverables.json에 존재하지 않는 파일 참조
