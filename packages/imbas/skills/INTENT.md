# skills — imbas Skill Definitions

## Purpose

12개 imbas 사용자 호출 스킬의 정의 파일을 포함한다. 각 스킬은 SKILL.md (메인 프롬프트)와 references/ (상세 참조) 쌍으로 구성되며, 프로바이더 독립적 스킬은 `references/<provider>/` 하위 폴더를 통해 프로바이더별 워크플로우를 분리한다.

## Structure

| 경로 | 역할 |
|------|------|
| `imbas-pipeline/` | 전체 파이프라인 오케스트레이션 (Phase 0~3.5) |
| `imbas-validate/` | Phase 1 문서 검증 |
| `imbas-split/` | Phase 2 Story 분할 |
| `imbas-devplan/` | Phase 3 개발 계획 (EARS Subtask 생성) |
| `imbas-manifest/` | Phase 2.5/3.5 매니페스트 배치 실행 |
| `imbas-digest/` | 이슈 컨텍스트 압축 |
| `imbas-fetch-media/` | Jira/Confluence 미디어 다운로드 |
| `imbas-read-issue/` | 이슈 + 댓글 스레드 복원 (internal) |
| `imbas-scaffold-pr/` | 이슈 기반 Draft PR 생성 |
| `imbas-setup/` | `.imbas/` 초기화 |
| `imbas-status/` | 런 상태 조회 |
| `imbas-cache/` | Jira 메타데이터 캐시 (internal) |

## Conventions

- 각 스킬 디렉토리: `SKILL.md` + `references/workflow.md` (또는 `references/<provider>/workflow.md`)
- 스킬 이름: kebab-case, `imbas-` 접두사
- 프로바이더 분리: `references/jira/`, `references/github/`, `references/local/` — SKILL.md는 `config.provider`로 라우팅

## Boundaries

### Always do

- 새 스킬 추가 시 SKILL.md + references/ 쌍 생성
- `plugin.json`에 스킬 등록 추가
- Tier-1/2a 다단계 스킬에 3-layer anti-yield 가드 포함 (preamble + inline directives + DO NOT STOP callouts)
- 프로바이더 경계 엄격 준수 (X 실행 시 Y 프로바이더 파일 금지)

### Ask first

- 기존 스킬 워크플로우 단계 변경 (의존 스킬에 영향)
- 스킬 이름 변경 또는 `user_invocable` 플래그 변경
- 새 프로바이더 추가

### Never do

- SKILL.md에 MCP 도구 시그니처 상세 기술 (references/에 기술)
- 스킬 디렉토리에 소스 코드 (.ts) 파일 배치
- Tier-3 단일 phase 스킬에 anti-yield preamble 추가 (과잉 체이닝 유발)
