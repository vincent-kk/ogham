# skills — FCA-AI Skill Definitions

## Purpose

17개 FCA-AI 사용자 호출 스킬의 정의 파일을 포함한다. 각 스킬은 SKILL.md (메인 프롬프트)와 reference.md (상세 참조) 쌍으로 구성된다.

## Structure (grouped by role)

| 그룹 | 스킬 |
|------|------|
| 파이프라인/리뷰 | `filid-pipeline`, `filid-review`, `filid-resolve`, `filid-revalidate`, `filid-structure-review` |
| 문서/동기화 | `filid-update`, `filid-pull-request`, `filid-sync`, `filid-restructure`, `filid-migrate` |
| 스캔/설정 | `filid-setup`, `filid-scan`, `filid-guide`, `filid-context-query`, `filid-config` |
| 테스트/폴백 | `filid-promote`, `filid-ast-fallback` |

## Conventions

- 각 스킬 디렉토리: `SKILL.md` (LLM 프롬프트) + `reference.md` (상세 문서)
- 스킬 이름: kebab-case
- SKILL.md는 워크플로우 개요, reference.md는 MCP 도구 시그니처/템플릿 상세

## Boundaries

### Always do

- 새 스킬 추가 시 SKILL.md + reference.md 쌍 생성
- `plugin.json`에 스킬 등록 추가
- Tier-1/2a 다단계 스킬에 3-layer anti-yield 가드 포함 (preamble + inline directives + DO NOT STOP callouts)
- Tier-2b 상호작용 스킬에 step-level escape hatch preamble 및 `[INTERACTIVE]` 마커 삽입

### Ask first

- 기존 스킬 워크플로우 단계 변경 (의존 스킬에 영향)
- 스킬 이름 변경 (사용자 호출 명령 변경)

### Never do

- SKILL.md에 MCP 도구 시그니처 상세 기술 (reference.md에 기술)
- 스킬 디렉토리에 소스 코드 (.ts) 파일 배치
- Tier-3 단일 phase 스킬에 anti-yield preamble 추가 (과잉 체이닝 유발)
