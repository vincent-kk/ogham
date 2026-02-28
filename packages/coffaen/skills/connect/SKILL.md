---
name: connect
user_invocable: true
description: 외부 데이터소스 등록/관리 — Execution Area .coffaen-meta/data-sources.json 설정
version: 1.0.0
complexity: medium
plugin: coffaen
---

# connect — 데이터소스 등록/관리

외부 데이터 소스(GitHub, Jira, Slack 등)를 coffaen에 연결하고 수집 스케줄을
설정합니다. `/coffaen:setup`의 데이터소스 등록 단계를 독립 실행할 수 있는 스킬입니다.

> **영역 구분**:
> - **Execution Area** (이 스킬이 수정하는 범위): `{CWD}/.coffaen-meta/data-sources.json`
> - **Plugin Area** (수정 금지): `packages/coffaen/` 소스 코드
>
> 이 스킬은 Execution Area만 수정합니다.

## 언제 사용하는가

- 새 외부 데이터소스를 coffaen에 연결할 때
- 기존 데이터소스 수집 빈도를 변경할 때
- 연결된 소스 목록을 확인할 때
- 특정 소스를 비활성화/제거할 때

## 전제 조건

- coffaen이 초기화되어 있어야 합니다 (`.coffaen-meta/` 디렉토리 존재)
- 미초기화 시: "먼저 `/coffaen:setup`을 실행해주세요." 안내

## 지원 데이터소스

| 소스 | MCP 도구 | 수집 내용 |
|------|---------|----------|
| GitHub | `mcp__github__*` | Issues, PRs, Discussions, 코드 변경 |
| Jira | `mcp__jira__*` | Issues, 스프린트, 프로젝트 |
| Slack | `mcp__slack__*` | 채널 메시지, 스레드 |
| Notion | `mcp__notion__*` | 페이지, 데이터베이스 |
| 로컬 디렉토리 | 파일시스템 직접 | 마크다운, 텍스트 파일 |
| RSS/웹 | HTTP | 블로그, 뉴스피드 |

## 워크플로우

### 모드 선택

```
/coffaen:connect          -- 대화형 (소스 추가/수정)
/coffaen:connect list     -- 연결된 소스 목록 조회
/coffaen:connect add      -- 새 소스 추가
/coffaen:connect remove   -- 소스 제거
/coffaen:connect disable  -- 소스 비활성화 (삭제 없이)
/coffaen:connect enable   -- 비활성화된 소스 재활성화
```

### 대화형 모드 흐름

#### Step 1 — 현재 상태 표시

`.coffaen-meta/data-sources.json`을 읽어 현재 연결된 소스를 표시합니다.

```
현재 연결된 데이터소스:
  [활성] GitHub (매 세션)
  [비활성] Slack

어떻게 하시겠습니까?
  1. 새 소스 추가
  2. 기존 소스 수정
  3. 소스 비활성화/삭제
  4. 완료
```

#### Step 2 — 소스 선택

```
어떤 소스를 연결하시겠습니까? (복수 선택 가능)
  [ ] GitHub (Issues, PRs)
  [ ] Jira
  [ ] Slack
  [ ] Notion
  [ ] 로컬 디렉토리
  [ ] RSS/웹
  [ ] 없음 (나중에 설정)
```

#### Step 3 — 수집 빈도 설정

각 선택된 소스에 대해:

```
{소스명}의 수집 빈도를 선택하세요:
  1. 매 세션 시작 시 (기본)
  2. 매일 1회
  3. 매주 1회
  4. 수동만
```

#### Step 4 — 소스별 상세 설정

**GitHub**:
```
GitHub 저장소 설정:
- 저장소: {owner}/{repo} (예: vincent-kk/ogham)
- 수집 항목: [x] Issues  [x] PRs  [ ] Discussions
- 상태 필터: [x] open  [ ] closed  [ ] all
```

**로컬 디렉토리**:
```
로컬 디렉토리 설정:
- 경로: {절대 경로 또는 CWD 상대 경로}
- 파일 패턴: *.md, *.txt (기본)
- 재귀 탐색: [예/아니오]
```

#### Step 5 — data-sources.json 저장

`.coffaen-meta/data-sources.json`을 생성/갱신합니다.

```json
{
  "sources": [
    {
      "id": "github-main",
      "type": "github",
      "enabled": true,
      "schedule": "session",
      "config": {
        "repo": "vincent-kk/ogham",
        "collect": ["issues", "prs"]
      },
      "last_collected": null,
      "created_at": "2026-02-28T10:00:00Z"
    }
  ],
  "updated_at": "2026-02-28T10:00:00Z"
}
```

#### Step 6 — 완료 안내

```
데이터소스 설정 완료!

연결된 소스:
  ✓ GitHub (매 세션) — github-main
  ✓ 로컬 ./docs/ (수동)

다음 단계:
  - 외부 MCP 도구가 필요하면: `/coffaen:mcp-setup`
  - 지금 바로 수집하려면: `/coffaen:ingest`
```

## 파일 범위 (Execution Area만 수정)

| 파일 | 위치 | 작업 |
|------|------|------|
| `data-sources.json` | `{CWD}/.coffaen-meta/` | 생성/갱신 |

**절대 수정하지 않는 파일**:
- `{CWD}/.mcp.json` → `/coffaen:mcp-setup` 담당
- `{CWD}/.claude/settings.json` → `/coffaen:mcp-setup` 담당
- `{CWD}/.claude/settings.local.json` → 영구 수정 금지 (사용자 개인 설정)
- `packages/coffaen/` 내 모든 파일 → Plugin Area (수정 금지)

## 옵션

```
/coffaen:connect [모드] [소스ID]
```

| 옵션 | 설명 |
|------|------|
| `list` | 현재 소스 목록 표시 |
| `add` | 새 소스 추가 (대화형) |
| `remove <id>` | 소스 제거 |
| `disable <id>` | 소스 비활성화 |
| `enable <id>` | 소스 활성화 |

## 오류 처리

- **coffaen 미초기화**: `/coffaen:setup` 실행 안내
- **JSON 파싱 오류**: 기존 파일 백업 후 재생성 제안
- **중복 소스**: 기존 설정 덮어쓸지 확인
