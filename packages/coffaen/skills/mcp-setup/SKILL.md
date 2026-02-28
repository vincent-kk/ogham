---
name: mcp-setup
user_invocable: true
description: 외부 MCP 서버 셋업 — Execution Area .mcp.json + .claude/settings.json 수정
version: 1.0.0
complexity: medium
plugin: coffaen
---

# mcp-setup — 외부 MCP 서버 셋업

외부 데이터소스(GitHub, Atlassian, Slack, Notion 등)의 MCP 서버를 현재 프로젝트에
설치하고 구성합니다. `/coffaen:setup`의 MCP 셋업 단계를 독립 실행할 수 있는 스킬입니다.

> **영역 구분 (중요)**:
>
> | 영역 | 경로 | 이 스킬의 수정 여부 |
> |------|------|------------------|
> | **Execution Area** | `{CWD}/.mcp.json` | **수정** |
> | **Execution Area** | `{CWD}/.claude/settings.json` | **수정** |
> | **Execution Area** | `{CWD}/.claude/settings.local.json` | **절대 수정 금지** |
> | **Plugin Area** | `packages/coffaen/.mcp.json` | **수정 금지** (coffaen 자체 MCP) |
>
> `{CWD}/.mcp.json`은 사용자 프로젝트의 외부 MCP 서버 등록 파일입니다.
> `packages/coffaen/.mcp.json`(coffaen 자체 MCP)과 다른 파일입니다.

## 언제 사용하는가

- GitHub, Jira, Slack 등 외부 MCP 도구를 프로젝트에 추가할 때
- `/coffaen:connect`로 소스를 등록한 후 MCP 서버를 설치할 때
- MCP 서버 연결을 수동으로 검증하거나 재설정할 때

## 전제 조건

- coffaen이 초기화되어 있어야 합니다
- 데이터소스가 등록되어 있으면 해당 소스용 MCP를 자동 제안합니다
  (`.coffaen-meta/data-sources.json` 참조)

## 지원 MCP 서버

| 데이터소스 | MCP 패키지 | 설치 명령 |
|----------|-----------|---------|
| GitHub | `@anthropic/github-mcp` | `claude mcp add github` |
| Atlassian (Jira/Confluence) | `atlassian-mcp` | `claude mcp add atlassian` |
| Slack | `@anthropic/slack-mcp` | `claude mcp add slack` |
| Notion | `notion-mcp` | `claude mcp add notion` |
| Linear | `linear-mcp` | `claude mcp add linear` |

## 워크플로우

### Step 1 — 현재 상태 확인

등록된 데이터소스와 이미 설치된 MCP 서버를 확인합니다.

```
현재 상태:
  데이터소스: GitHub (github-main), Slack
  설치된 MCP: (없음)

필요한 MCP 서버:
  - GitHub → @anthropic/github-mcp (미설치)
  - Slack  → @anthropic/slack-mcp  (미설치)
```

### Step 2 — 설치할 MCP 서버 선택

```
어떤 MCP 서버를 설치하시겠습니까?
  [x] @anthropic/github-mcp (GitHub)
  [x] @anthropic/slack-mcp (Slack)
  [ ] atlassian-mcp (Jira/Confluence)
  [ ] notion-mcp (Notion)
  [ ] 직접 입력...
```

### Step 3 — Execution Area 파일 수정

각 선택된 MCP 서버에 대해:

#### 3a. {CWD}/.mcp.json 업데이트

기존 파일이 있으면 기존 내용을 보존하고 새 서버만 추가합니다.

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic/github-mcp"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "slack": {
      "command": "npx",
      "args": ["-y", "@anthropic/slack-mcp"],
      "env": {
        "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}"
      }
    }
  }
}
```

#### 3b. {CWD}/.claude/settings.json 업데이트

필요한 권한 설정을 추가합니다.

```json
{
  "permissions": {
    "allow": [
      "mcp__github__*",
      "mcp__slack__*"
    ]
  }
}
```

> **절대 수정하지 않는 파일**: `{CWD}/.claude/settings.local.json`
> 이 파일은 사용자 개인 설정으로 coffaen이 절대 수정하지 않습니다.

### Step 4 — API 키/토큰 수집

환경 변수 또는 직접 입력 방식으로 인증 정보를 안내합니다.

```
GitHub 인증 설정:

GITHUB_TOKEN이 필요합니다.

설정 방법:
  1. 환경 변수로 설정 (권장):
     export GITHUB_TOKEN=ghp_xxxx
  2. .env 파일에 추가 (gitignore 필수):
     GITHUB_TOKEN=ghp_xxxx

⚠️  토큰을 코드에 직접 입력하지 마세요.
    .mcp.json은 ${GITHUB_TOKEN} 형태로 환경 변수를 참조합니다.
```

### Step 5 — 연결 검증

MCP 서버가 정상 응답하는지 확인합니다.

```
연결 검증 중...
  GitHub MCP: ✓ 연결됨
  Slack MCP:  ✗ 연결 실패 (SLACK_BOT_TOKEN 없음)
```

실패 시 디버깅 안내를 제공합니다.

### Step 6 — 완료 안내

```
MCP 설정 완료!

설치된 서버:
  ✓ GitHub MCP (@anthropic/github-mcp)
  ✗ Slack MCP — SLACK_BOT_TOKEN 설정 필요

다음 단계:
  - 토큰 설정 후 재확인: `/coffaen:mcp-setup --verify`
  - 데이터 수집 시작: `/coffaen:ingest`
```

## 파일 범위 (Execution Area만 수정)

| 파일 | 작업 | 비고 |
|------|------|------|
| `{CWD}/.mcp.json` | 생성/갱신 | 기존 내용 보존 |
| `{CWD}/.claude/settings.json` | 생성/갱신 | 기존 내용 보존 |

**절대 수정하지 않는 파일**:
- `{CWD}/.claude/settings.local.json` — 영구 수정 금지
- `packages/coffaen/.mcp.json` — Plugin Area (coffaen 자체 MCP 서버 설정)
- `packages/coffaen/` 내 모든 파일 — Plugin Area

## 옵션

```
/coffaen:mcp-setup [옵션]
```

| 옵션 | 설명 |
|------|------|
| `--verify` | 기존 MCP 서버 연결 상태만 검증 |
| `--list` | 설치된 MCP 서버 목록 조회 |
| `--remove <name>` | 특정 MCP 서버 제거 |

## 비개발자 안내

이 스킬은 기술적인 설정을 포함합니다. 다음과 같은 개념이 낯설다면
도움을 요청하세요:

- MCP (Model Context Protocol): Claude가 외부 서비스를 사용하는 방법
- API 토큰: 외부 서비스 인증 키
- 환경 변수: 민감한 정보를 안전하게 저장하는 방법

```
"GitHub MCP 설정을 도와주세요" 라고 말씀하시면
단계별로 안내해 드립니다.
```

## 오류 처리

- **coffaen 미초기화**: `/coffaen:setup` 실행 안내
- **기존 .mcp.json 파싱 오류**: 백업 생성 후 수동 병합 제안
- **MCP 서버 연결 실패**: 토큰/설치 여부 확인 안내
- **권한 오류**: `.claude/settings.json` 수동 편집 방법 안내
