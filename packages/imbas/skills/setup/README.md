# setup

`.imbas/` 디렉토리 초기화, config.json 생성, Jira 프로젝트 메타데이터 캐싱을 수행하는 설정 스킬.

## 개요

imbas를 사용하기 위한 최초 설정을 담당한다.
Jira 프로젝트를 선택하고, 설정 파일을 생성하며, 프로젝트 메타데이터(이슈 타입, 링크 타입 등)를 캐싱한다.

## 서브커맨드

| 커맨드 | 설명 |
|--------|------|
| `init` (기본) | 대화형 초기화 — 프로젝트 선택, config 생성, 캐시 구축 |
| `show` | 현재 설정 및 캐시 상태 표시 |
| `set-project <KEY>` | 기본 프로젝트 변경 + 캐시 갱신 |
| `set-language <field> <lang>` | 언어 설정 변경 (documents, skills, jira_content, reports) |
| `refresh-cache [KEY]` | Jira 메타데이터 강제 갱신 |
| `clear-temp` | `.imbas/.temp/` 임시 파일 삭제 |

## init 워크플로우

1. **디렉토리 생성** — `.imbas/` 생성, `.imbas/.gitignore` 설정
2. **프로젝트 선택** — Atlassian MCP로 사용 가능한 프로젝트 목록 조회, 사용자 선택
3. **config.json 생성** — 버전, 언어, 기본값, Jira 설정, 미디어 설정 포함
4. **캐시 구축** — 이슈 타입, 필수 필드, 링크 타입 조회 및 저장
5. **.gitignore 보호** — 프로젝트 루트 `.gitignore`에 `.imbas/` 추가
6. **결과 표시** — 설정 요약 및 다음 단계 안내

## 생성되는 구조

```
.imbas/
├── .gitignore
├── config.json
└── <PROJECT-KEY>/
    └── cache/
        ├── project-meta.json
        ├── issue-types.json
        ├── link-types.json
        ├── workflows.json
        └── cached_at.json
```

## 사용 도구

| 도구 | 출처 | 용도 |
|------|------|------|
| `imbas_config_get` | imbas MCP | 설정 읽기 |
| `imbas_config_set` | imbas MCP | 설정 생성/수정 |
| `imbas_cache_set` | imbas MCP | 캐시 저장 |
| `getVisibleJiraProjects` | Atlassian MCP | 프로젝트 목록 조회 |
| `getJiraProjectIssueTypesMetadata` | Atlassian MCP | 이슈 타입 조회 |
| `getJiraIssueTypeMetaWithFields` | Atlassian MCP | 타입별 필수 필드 조회 |
| `getIssueLinkTypes` | Atlassian MCP | 링크 타입 조회 |

## 참고 파일

- `references/init-workflow.md` — 초기화 워크플로우 상세
- `references/subcommands.md` — 서브커맨드별 동작
- `references/errors.md` — 에러 처리
- `references/tools.md` — 사용 도구 상세
