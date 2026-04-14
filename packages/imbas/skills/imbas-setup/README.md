# imbas-setup

`.imbas/` 디렉토리 초기화, provider 선택, config.json 생성, 프로젝트 메타데이터 캐싱을 수행하는 설정 스킬.

## 개요

imbas를 사용하기 위한 최초 설정을 담당한다.
원격 도구(Atlassian MCP, GitHub CLI) 가용성을 점검하고, provider(`jira` / `github` / `local`)를 선택한 뒤,
설정 파일을 생성하며, provider별 메타데이터를 캐싱한다.
원격 도구가 없어도 `local` provider로 로컬 전용 워크플로우를 사용할 수 있다.

## 서브커맨드

| 커맨드 | 설명 |
|--------|------|
| `init` (기본) | 대화형 초기화 — 프로젝트 선택, config 생성, 캐시 구축 |
| `show` | 현재 설정 및 캐시 상태 표시 |
| `set-project <KEY>` | 기본 프로젝트 변경 + 캐시 갱신 |
| `set-provider <PROVIDER>` | provider 변경 (`jira` / `github` / `local`) + 헬스 체크 + 캐시 재구축 |
| `set-language <field> <lang>` | 언어 설정 변경 (documents, skills, issue_content, reports) |
| `refresh-cache [KEY]` | 메타데이터 강제 갱신 (provider별 분기) |
| `clear-temp` | `.imbas/.temp/` 임시 파일 삭제 |

## init 워크플로우

0. **환경 헬스 체크** — Atlassian MCP / GitHub CLI 가용성 확인 (non-blocking). 누락 도구에 대해 자동 설정 제안.
1. **Provider 선택** — 헬스 체크 결과에 따라 사용 가능한 provider 표시 (`jira` / `github` / `local`)
2. **디렉토리 생성** — `.imbas/` 생성, `.imbas/.gitignore` 설정
3. **프로젝트 참조 선택** — provider별 분기: Jira 프로젝트 / GitHub owner/repo / 로컬 프로젝트 키
4. **config.json 생성** — provider, 버전, 언어, 기본값, provider별 설정, 미디어 설정 포함
5. **캐시 구축** — provider별 분기: Jira 메타데이터 / GitHub 라벨 / local은 skip
6. **.gitignore 보호** — 프로젝트 루트 `.gitignore`에 `.imbas/` 추가
7. **결과 표시** — 설정 요약 및 다음 단계 안내

## 생성되는 구조

```
.imbas/
├── .gitignore
├── config.json                  # provider 필드 포함
└── <PROJECT-REF>/
    ├── cache/                   # [jira] issue-types, link-types, project-meta
    │   ├── project-meta.json    # [github] label inventory
    │   ├── issue-types.json     # [local] cache 디렉토리 없음
    │   ├── link-types.json
    │   ├── workflows.json
    │   └── cached_at.json
    └── issues/                  # [local] only
        ├── stories/
        ├── tasks/
        └── subtasks/
```

## 사용 도구

| 도구 | 출처 | 용도 |
|------|------|------|
| `mcp_tools_config_get` | imbas MCP | 설정 읽기 |
| `mcp_tools_config_set` | imbas MCP | 설정 생성/수정 |
| `mcp_tools_cache_set` | imbas MCP | 캐시 저장 |
| `[OP: get_projects]` | Jira ([OP:]) | 프로젝트 목록 조회 |
| `[OP: get_issue_types]` | Jira ([OP:]) | 이슈 타입 조회 |
| `[OP: get_issue_type_fields]` | Jira ([OP:]) | 타입별 필수 필드 조회 |
| `[OP: get_link_types]` | Jira ([OP:]) | 링크 타입 조회 |
| `mcp_tools_atlassianUserInfo` | Atlassian MCP | 연결 상태 확인 (헬스 체크) |
| `which gh` / `gh auth status` | Bash | GitHub CLI 설치/인증 확인 (헬스 체크) |

## 참고 파일

- `references/init-workflow.md` — 초기화 워크플로우 상세
- `references/subcommands.md` — 서브커맨드별 동작
- `references/health-check.md` — 환경 헬스 체크 절차 및 자동 설정
- `references/mcp-config-scopes.md` — MCP 설정 파일 scope 체계 (user/project/local)
- `references/errors.md` — 에러 처리
- `references/tools.md` — 사용 도구 상세
