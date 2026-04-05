# skills — FCA-AI Skill Definitions

## Purpose

17개 FCA-AI 사용자 호출 스킬의 정의 파일을 포함한다. 각 스킬은 SKILL.md (메인 프롬프트)와 reference.md (상세 참조) 쌍으로 구성된다.

## Structure

| 경로 | 역할 |
|------|------|
| `filid-init/` | 프로젝트 초기화 (Phase 0 설정 + 디렉토리 분류) |
| `filid-review/` | 다중 페르소나 합의 기반 코드 리뷰 |
| `filid-scan/` | FCA-AI 규칙 위반 스캔 |
| `filid-resolve/` | 리뷰 Fix Request 해결 워크플로우 |
| `filid-revalidate/` | 수정 후 델타 기반 재검증 |
| `filid-update/` | 코드-문서-테스트 동기화 |
| `filid-pull-request/` | FCA-aware PR 자동 생성 |
| `filid-pipeline/` | PR→리뷰→리졸브→재검증 파이프라인 |
| `filid-sync/` | 구조 드리프트 감지 및 보정 |
| `filid-restructure/` | 프랙탈 원칙 기반 구조 재편 |
| `filid-structure-review/` | 6단계 PR 구조 검증 |
| `filid-guide/` | 디렉토리별 프랙탈 가이드 생성 |
| `filid-context-query/` | FCA-AI 컨텍스트 모듈/규칙 조회 |
| `filid-promote/` | test.ts → spec.ts 승격 |
| `filid-migrate/` | CLAUDE.md → INTENT.md 마이그레이션 |
| `filid-ast-fallback/` | LLM AST 패턴 매칭 폴백 |
| `filid-config/` | `.filid/config.json` 설정 관리 (show/set/reset) |

## Conventions

- 각 스킬 디렉토리: `SKILL.md` (LLM 프롬프트) + `reference.md` (상세 문서)
- 스킬 이름: kebab-case
- SKILL.md는 워크플로우 개요, reference.md는 MCP 도구 시그니처/템플릿 상세

## Boundaries

### Always do

- 새 스킬 추가 시 SKILL.md + reference.md 쌍 생성
- `plugin.json`에 스킬 등록 추가

### Ask first

- 기존 스킬 워크플로우 단계 변경 (의존 스킬에 영향)
- 스킬 이름 변경 (사용자 호출 명령 변경)

### Never do

- SKILL.md에 MCP 도구 시그니처 상세 기술 (reference.md에 기술)
- 스킬 디렉토리에 소스 코드 (.ts) 파일 배치
