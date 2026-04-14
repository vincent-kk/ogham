# `imbas:imbas-scaffold-pr`

Jira Story나 GitHub 이슈로부터 서브태스크 체크리스트가 포함된 Draft PR을 생성하는 스킬.

## 개요

이슈(Story, Task, Bug)의 메타데이터와 서브태스크 목록을 읽어, 해당 이슈 전용 브랜치를 생성하고 빈 커밋(empty commit)을 추가한 뒤 Draft PR을 생성한다.
PR 본문에는 각 서브태스크가 체크리스트 형태로 포함되어 진행 상황을 추적할 수 있다.
코드 변경 없이 인프라와 추적 구조만 먼저 구성할 때 유용하다.

## 사용법

```
/imbas:imbas-scaffold-pr <issue-ref> [--base <branch>] [--draft true|false]

<issue-ref>  : 이슈 참조 — Jira 키 (예: PROJ-123) 또는 GitHub 이슈 (예: owner/repo#42)
--base       : PR 대상 브랜치 (기본값: 저장소의 기본 브랜치)
--draft      : Draft PR로 생성 여부 (기본값: true)
```

## 워크플로우

1. **이슈 읽기** — `imbas:read-issue`를 사용하여 이슈 메타데이터(키, 요약, 타입)를 조회한다.
2. **Provider 확인** — `config.provider`를 확인한다 (`local` provider는 PR 생성을 지원하지 않음).
3. **서브태스크 조회** — 해당 이슈의 모든 서브태스크(Jira) 또는 연관 이슈(GitHub)를 가져온다.
4. **브랜치 생성** — 이슈 타입에 따른 접두사(`feature/`, `bug/`, `task/`)와 이슈 키를 조합하여 브랜치를 생성한다.
5. **빈 커밋 추가** — `chore: scaffold PR for <issue-key>` 메시지와 함께 빈 커밋을 생성한다.
6. **PR 생성** — 브랜치를 push하고, 서브태스크 체크리스트가 포함된 PR 본문을 구성하여 Draft PR을 생성한다.

## 브랜치 명명 규칙

| 이슈 타입 | 접두사 | 예시 |
|-----------|--------|------|
| `Story` | `feature/` | `feature/PROJ-123` |
| `Bug` | `bug/` | `bug/PROJ-456` |
| `Task` | `task/` | `task/PROJ-789` |
| 기타 | `feature/` | `feature/PROJ-000` |

## 사용 도구

| 도구 | 출처 | 용도 |
|------|------|------|
| `imbas:read-issue` | imbas 내부 스킬 | 이슈 메타데이터 및 서브태스크 조회 |
| `config_get` | imbas MCP | provider 설정 확인 |
| `git` | Bash | 브랜치 및 빈 커밋 생성 |
| `gh repo view` | GitHub CLI | 기본 브랜치 감지 |
| `gh pr create` | GitHub CLI | PR 생성 |

에이전트 스폰 없음. 스킬이 직접 Git 및 GitHub CLI 명령을 실행한다.

## 참고 파일

- `references/workflow.md` — 전체 워크플로우 상세 (브랜치 명명, 커밋 메시지 등)
- `references/tools.md` — 사용 도구 및 Bash 명령어 상세
- `references/errors.md` — 에러 처리 (브랜치 중복, provider 미지원 등)
