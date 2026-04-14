# @ogham/atlassian

Claude Code 환경에서 Atlassian Jira와 Confluence를 네이티브로 통합하는 플러그인입니다.

LLM의 컨텍스트를 낭비하는 50개 이상의 개별 MCP 도구를 노출하는 대신, 이 플러그인은 **도메인 전문가 에이전트(Domain Expert Agents)**와 **지연 참조 로딩(Lazy Reference Loading)** 패턴을 사용하여 토큰 효율성을 극대화합니다. 기존 Python 기반의 `mcp-atlassian` 서버를 완전히 대체합니다.

---

## 설치

### Marketplace를 통한 설치 (권장)

```bash
# 1. Marketplace에 저장소 등록
claude plugin marketplace add https://github.com/vincent-kk/ogham

# 2. 플러그인 설치
claude plugin install atlassian
```

설치 후 별도 설정 없이 모든 컴포넌트(Skills, MCP, Agents)가 자동 등록됩니다.

### 개발자용 로컬 설치

```bash
# 모노레포 루트에서
yarn install

# 플러그인 빌드
cd packages/atlassian
yarn build

# Claude Code에서 플러그인 로드
claude --plugin-dir ./packages/atlassian
```

빌드하면 `bridge/mcp-server.cjs` 위치에 MCP 서버 번들이 생성됩니다.

---

## 사용법

단순히 도구들을 LLM 컨텍스트에 쏟아붓는 일반적인 MCP 서버와 달리, 이 플러그인은 **Agent**와 **Skill**을 사용합니다. Claude Code 내에서 자연어로 대화하듯 요청하면 됩니다. Cloud/Server 분기 처리 및 포맷 변환(ADF/Storage/Wiki <-> Markdown)은 플러그인이 투명하게 처리합니다.

### 초기 설정

```
/atlassian-setup
```

Jira 및 Confluence의 Cloud 또는 Server/DC 인스턴스에 대한 인증(Basic, PAT, OAuth 2.0) 및 연결 정보를 설정합니다. 로컬 웹 서버를 띄워 편리한 설정 UI를 제공합니다.

### Jira 작업

자연어로 요청하세요. **Jira Agent**가 JQL 포맷팅, 필드 스키마 확인, 상태 전환 및 에러 복구를 알아서 처리합니다.

```
Jira에서 내게 할당된 열린 이슈 목록 보여줘
PROJ-123 이슈 상태를 'In Progress'로 변경해줘
DEV 프로젝트에 로그인 버그에 대한 새 이슈를 생성해줘
```

### Confluence 작업

**Confluence Agent**가 CQL 검색, 페이지 계층 구조, V1/V2 API 자동 선택, Storage Format XHTML 변환을 처리합니다.

```
'Engineering' 스페이스에서 최근 업데이트된 문서 찾아줘
Confluence 페이지 12345의 내용을 요약해줘
이 회의록 내용으로 TEAM 스페이스에 새 페이지를 작성해줘
```

### 크로스 도메인 워크플로우

Claude Code가 Jira와 Confluence 에이전트 사이를 매끄럽게 조율합니다.

```
Jira 이슈 PROJ-456의 세부 내용을 읽고 Confluence에 릴리스 노트를 작성해줘
```

---

## 아키텍처

효율성과 안정성을 극대화하기 위해 4계층 아키텍처를 사용합니다:

1. **Dispatcher**: Claude Code에 내장된 에이전트 라우팅을 사용합니다.
2. **Agent 계층**: 도메인 지식(포맷팅, 워크플로우 규칙, 에러 복구 전략)을 내장한 도메인 전문가(`jira`, `confluence`)입니다. 복잡한 다단계 작업을 오케스트레이션합니다.
3. **Skill 계층**: 컨텍스트 창을 작게 유지하기 위해 **지연 참조 로딩(Lazy Reference Loading)**을 사용하는 API 스펙 캡슐(`atlassian-jira`, `atlassian-confluence`)입니다. 도구 스키마는 필요할 때만 로드됩니다.
4. **MCP 계층**: 도메인 지식이 없는 유틸리티 계층으로, 범용 HTTP 실행(`fetch`), 양방향 포맷 변환(`convert`), 인증 설정(`setup`) 도구를 제공합니다.

---

## 전체 스킬 목록

| 스킬 | 범위 | 설명 |
| --- | --- | --- |
| `/atlassian-setup` | 공통 | 인증 및 연결 관리 (Basic, PAT, OAuth 2.0) |
| `/atlassian-download` | 공통 | Jira/Confluence 통합 첨부파일 다운로드 |
| `/atlassian-jira` | Jira | Jira API 도메인 라우터 (이슈, 검색, 애자일 등 15개 도메인) |
| `/atlassian-confluence` | Confluence | Confluence API 도메인 라우터 (페이지, 검색, 스페이스 등 8개 도메인) |

---

## 개발

```bash
yarn dev            # TypeScript watch 모드
yarn test           # Vitest watch
yarn test:run       # 1회 실행
yarn typecheck      # 타입 체크
yarn build          # tsc + node scripts/build-mcp-server.mjs
```

### 기술 스택

TypeScript 5.7, @modelcontextprotocol/sdk, esbuild, Vitest, Zod

---

## 상세 문서

기술적 세부사항 및 아키텍처 결정 사항은 [`.metadata/atlassian/`](../../.metadata/atlassian/) 디렉토리를 참조하세요:

| 문서 | 내용 |
| --- | --- |
| [INDEX](../../.metadata/atlassian/INDEX.md) | 아키텍처 개요 및 계층별 역할 |
| [plugin-structure](../../.metadata/atlassian/plugin-structure.md) | 디렉토리 구조 및 플러그인 설정 |
| [auth-ui](../../.metadata/atlassian/auth-ui.md) | 설정용 웹 서버 및 HTML 폼 설계 |
| [dev/mcp-tools](../../.metadata/atlassian/dev/mcp-tools.md) | 3개의 핵심 MCP 도구 (`fetch`, `convert`, `setup`) |
| [dev/skills](../../.metadata/atlassian/dev/skills.md) | 4개의 스킬 및 지연 참조 로딩 매핑 구조 |
| [dev/agents](../../.metadata/atlassian/dev/agents.md) | Jira 및 Confluence 에이전트 도메인 로직 |

[English documentation (README.md)](./README.md) is also available.

---

## License

MIT
