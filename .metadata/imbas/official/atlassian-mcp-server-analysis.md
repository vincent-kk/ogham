# Atlassian MCP Server 분석

> **소스**: `~/Workspace/atlassian-mcp-server` (GitHub: `atlassian/atlassian-mcp-server`)
> **분석일**: 2026-04-03

---

## 개요

Atlassian Rovo MCP Server는 Atlassian Cloud(Jira, Confluence, Compass)와 외부 AI 도구를 연결하는 클라우드 기반 MCP 서버이다. OAuth 2.1 또는 API 토큰 인증을 사용하며, 서버 엔드포인트는 `https://mcp.atlassian.com/v1/mcp`이다.

이 레포지토리 자체에는 MCP 서버 코드가 없고, **Skill 정의 파일**과 **유효성 검증 스크립트**만 포함한다. 서버는 Atlassian이 호스팅하는 원격 서비스이며, 이 레포는 클라이언트 측 Skill 구성과 플러그인 템플릿 검증을 제공한다.

### 지원 클라이언트

- Claude Code / Claude Desktop
- GitHub Copilot CLI
- Gemini CLI (`gemini-extension.json` 제공)
- VS Code
- OpenAI ChatGPT
- Amazon Quick Suite
- 로컬 MCP 호환 클라이언트 (`mcp-remote` 프록시 경유)

---

## 레포지토리 구조

```
atlassian-mcp-server/
├── skills/                              # MCP Skill 정의
│   ├── triage-issue/                    # 버그 트리아지 Skill
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── search-patterns.md       # JQL 중복 탐색 패턴 레퍼런스
│   │       └── bug-report-templates.md  # 버그 리포트 템플릿 6종
│   ├── capture-tasks-from-meeting-notes/ # 회의록→Jira 태스크 Skill
│   │   ├── SKILL.md
│   │   └── references/
│   │       └── action-item-patterns.md  # 액션 아이템 파싱 패턴
│   ├── generate-status-report/          # 상태 보고서 생성 Skill
│   │   ├── SKILL.md
│   │   ├── references/
│   │   │   ├── jql-patterns.md          # JQL 쿼리 패턴
│   │   │   └── report-templates.md      # 보고서 템플릿 4종
│   │   └── scripts/
│   │       └── jql_builder.py           # JQL 빌더 유틸리티
│   ├── search-company-knowledge/        # 사내 지식 검색 Skill
│   │   └── SKILL.md
│   └── spec-to-backlog/                 # 스펙→백로그 변환 Skill
│       ├── SKILL.md
│       └── references/
│           ├── epic-templates.md        # Epic 설명 템플릿 5종
│           ├── ticket-writing-guide.md  # 티켓 작성 가이드
│           └── breakdown-examples.md    # 태스크 분해 예시 5종
├── scripts/
│   └── validate-template.mjs           # 플러그인 구조 검증 스크립트
├── gemini-extension.json               # Gemini CLI 확장 설정
├── README.md
├── CODEOWNERS
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
└── SECURITY.md
```

---

## 1. Skill 구성 분석

### 1.1 triage-issue — 버그 트리아지

| 항목 | 내용 |
|---|---|
| **목적** | 버그 리포트/에러 메시지를 분석하여 Jira에서 중복 이슈를 탐색하고, 기존 이슈에 코멘트를 추가하거나 새 이슈를 생성 |
| **트리거 키워드** | `triage bug`, `check duplicate`, `is this a duplicate`, `create bug ticket`, `file a bug` 등 |
| **워크플로우** | 6단계: 정보 추출 → 중복 검색 → 결과 분석 → 사용자 제시 → 실행 → 요약 |
| **사용 MCP 도구** | `searchJiraIssuesUsingJql`, `getJiraIssue`, `addCommentToJiraIssue`, `createJiraIssue`, `getJiraProjectIssueTypesMetadata`, `getJiraIssueTypeMetaWithFields` |

**핵심 설계 패턴:**
- **다각도 검색 전략**: 에러 시그니처, 컴포넌트, 증상 3가지 축으로 병렬 JQL 검색
- **신뢰도 기반 분류**: 90%+ (확실한 중복), 70-90% (가능성 높음), 40-70% (관련 가능), 40% 미만 (신규)
- **회귀(Regression) 감지**: 해결된 이슈와 동일 패턴 발견 시 회귀 가능성 안내
- **Human-in-the-loop**: 항상 사용자에게 분석 결과를 제시한 후 행동

**참조 리소스:**
- `references/search-patterns.md` — 에러 기반, 컴포넌트 기반, 증상 기반, 시간 기반, 회귀 감지용 JQL 패턴 모음
- `references/bug-report-templates.md` — 백엔드 에러, 프론트엔드/UI, 성능, 데이터, 외부 연동, 회귀 6가지 유형의 버그 리포트 템플릿

---

### 1.2 capture-tasks-from-meeting-notes — 회의록 태스크 캡처

| 항목 | 내용 |
|---|---|
| **목적** | 회의록(Confluence 페이지 또는 붙여넣은 텍스트)에서 액션 아이템을 추출하여 Jira 태스크로 생성 |
| **트리거 키워드** | `meeting notes`, `action items`, `create tasks`, `extract tasks`, `from meeting` 등 |
| **워크플로우** | 7단계: 회의록 획득 → 액션 아이템 파싱 → 프로젝트 키 확인 → 계정 ID 조회 → 사용자 확인 → 태스크 생성 → 요약 |
| **사용 MCP 도구** | `getConfluencePage`, `lookupJiraAccountId`, `getVisibleJiraProjects`, `getJiraProjectIssueTypesMetadata`, `createJiraIssue` |

**핵심 설계 패턴:**
- **5가지 패턴 인식**: `@멘션`, `이름 + 동사`, `Action: 이름 - 태스크`, `TODO (이름)`, `이름: 태스크`
- **신뢰도 스코어링**: 패턴 유형별 신뢰도 등급(90%+, 60-90%, 60% 미만)
- **이름 검색 실패 처리**: 미발견 시 미할당 옵션, 다중 매치 시 사용자 선택
- **중복 감지**: 동일 태스크 중복 발견 시 사용자에게 확인

**참조 리소스:**
- `references/action-item-patterns.md` — 5가지 카테고리 패턴, 복합 패턴(다중 담당자, 조건부, 시간 제한), 안티 패턴(토의 내용, 과거 행동), 정규식 예제

---

### 1.3 generate-status-report — 상태 보고서 생성

| 항목 | 내용 |
|---|---|
| **목적** | Jira 이슈를 쿼리하여 프로젝트 상태 보고서를 생성하고 Confluence에 게시 |
| **트리거 키워드** | `status report`, `project status`, `weekly update`, `sprint report`, `publish to Confluence` 등 |
| **워크플로우** | 5단계: 범위 식별 → Jira 쿼리 → 데이터 분석 → 보고서 포맷팅 → Confluence 게시 |
| **사용 MCP 도구** | `searchJiraIssuesUsingJql`, `getConfluenceSpaces`, `createConfluencePage`, `getConfluencePage`, `updateConfluencePage` |

**핵심 설계 패턴:**
- **대상 독자별 포맷**: 임원/PM(Executive Summary), 팀(Detailed Technical), 일일 스탠드업(Daily)
- **다중 쿼리 전략**: 완료/진행중/차단/고우선순위 이슈를 별도 JQL로 병렬 조회
- **인터랙티브 워크플로우**: 보고 기간, 대상 독자, Confluence 게시 여부를 사용자와 확인
- **Confluence 통합**: 신규 페이지 생성 또는 기존 페이지 업데이트 지원

**참조 리소스:**
- `references/jql-patterns.md` — 프로젝트, 우선순위, 시간, 담당자, Epic/컴포넌트별 JQL 패턴
- `references/report-templates.md` — Executive Summary, Detailed Technical, Daily Standup, Priority Breakdown 4가지 템플릿
- `scripts/jql_builder.py` — Python JQL 빌더 유틸리티 (입력값 sanitize, 쿼리 조합 함수 6종)

---

### 1.4 search-company-knowledge — 사내 지식 검색

| 항목 | 내용 |
|---|---|
| **목적** | Confluence, Jira 등 사내 지식 시스템을 병렬 검색하여 종합적인 답변 제공 |
| **트리거 키워드** | `find information`, `search company knowledge`, `what is`, `explain`, `internal documentation` 등 |
| **워크플로우** | 5단계: 검색어 식별 → 병렬 검색 → 상세 콘텐츠 조회 → 결과 종합 → 출처 인용 |
| **사용 MCP 도구** | `search` (Rovo Search, 교차 시스템), `searchConfluenceUsingCql`, `searchJiraIssuesUsingJql`, `getConfluencePage`, `getJiraIssue` |

**핵심 설계 패턴:**
- **교차 시스템 검색 우선**: Rovo `search` 도구로 Confluence + Jira 동시 검색, 필요 시 타겟 검색 추가
- **정보 종합**: 여러 소스의 정보를 주제별로 재구성 (소스별 나열이 아닌 주제별 종합)
- **충돌 정보 명시**: 소스 간 정보가 상충할 경우 명확히 표기
- **출처 인용 필수**: 모든 답변에 Confluence 페이지 링크, Jira 이슈 키 등 출처 포함

---

### 1.5 spec-to-backlog — 스펙→백로그 변환

| 항목 | 내용 |
|---|---|
| **목적** | Confluence의 사양서(Spec) 문서를 분석하여 Epic + 하위 구현 티켓으로 구성된 Jira 백로그 자동 생성 |
| **트리거 키워드** | (frontmatter description 기반 매칭) `Create Jira tickets from a Confluence page`, `Generate a backlog from a specification` 등 |
| **워크플로우** | 7단계: Confluence 페이지 조회 → 프로젝트 키 확인 → 스펙 분석 → 분해안 제시 → Epic 생성 → 하위 티켓 생성 → 요약 |
| **사용 MCP 도구** | `getConfluencePage`, `search`, `getVisibleJiraProjects`, `getJiraProjectIssueTypesMetadata`, `getJiraIssueTypeMetaWithFields`, `createJiraIssue` |

**핵심 설계 패턴:**
- **Epic 먼저 생성**: 하위 티켓이 Epic에 링크되려면 Epic 키가 필요하므로 반드시 Epic 먼저 생성
- **이슈 유형 자동 분류**: 스펙 내용 키워드 분석으로 Bug/Story/Task 자동 선택
- **분해 원칙**: 스펙당 3~10개 태스크, 독립 구현 가능, 백엔드/프론트엔드/테스트/문서 포함
- **Epic 설명 구조화**: Overview, Source, Objectives, Scope, Success Criteria, Technical Notes

**참조 리소스:**
- `references/epic-templates.md` — 신기능, 버그 수정, 인프라/기술, API 개발, 리디자인/현대화 5가지 Epic 템플릿 + 상세 예시
- `references/ticket-writing-guide.md` — 요약문 작성법, 설명 구조, Acceptance Criteria 작성법, 유형별 가이드
- `references/breakdown-examples.md` — 알림 시스템, 결제 오류, DB 마이그레이션, REST API, 대시보드 리디자인 5가지 분해 예시

---

## 2. 스크립트 분석

### 2.1 scripts/validate-template.mjs — 플러그인 구조 검증기

| 항목 | 내용 |
|---|---|
| **언어** | Node.js (ESM) |
| **실행** | `#!/usr/bin/env node` — CLI 도구로 직접 실행 |
| **목적** | Cursor 플러그인 마켓플레이스 템플릿의 구조적 무결성을 검증 |

**검증 항목:**

| 검증 대상 | 내용 |
|---|---|
| **마켓플레이스 매니페스트** | `.cursor-plugin/marketplace.json` 존재 여부, `name` (kebab-case), `owner.name` 필수, `plugins` 배열 |
| **플러그인 매니페스트** | `.cursor-plugin/plugin.json` 존재 여부, `name` (소문자 + 영숫자/하이픈/마침표) |
| **이름 일치** | marketplace entry name ↔ plugin.json name 일치 확인 |
| **경로 참조 무결성** | `logo`, `rules`, `skills`, `agents`, `commands`, `hooks`, `mcpServers` 필드의 파일 경로가 실제 존재하는지 확인 |
| **경로 안전성** | 상대 경로만 허용, `../` 경로 탈출 차단, 절대 경로 차단 |
| **Frontmatter 검증** | Rules(`.md`)에 `description` 필수, Skills(`SKILL.md`)에 `name`+`description` 필수, Agents(`.md`)에 `name`+`description` 필수, Commands에 `name`+`description` 필수 |
| **선택적 검증** | `hooks/hooks.json` 존재 여부 (경고), `.mcp.json` 또는 `mcp.json` 존재 여부 (경고) |
| **중복 검사** | 마켓플레이스 내 플러그인 이름 중복 감지 |

**동작 모드:**
- **단일 플러그인 모드**: `.cursor-plugin/marketplace.json` 없이 `.cursor-plugin/plugin.json`만 있으면 단일 플러그인으로 검증
- **마켓플레이스 모드**: `marketplace.json`이 있으면 등록된 모든 플러그인을 순회하며 검증

**유틸리티 함수:**
- `parseFrontmatter()` — YAML frontmatter 파싱 (단순 key:value 추출, 라이브러리 미사용)
- `walkFiles()` — 디렉토리 재귀 탐색 (스택 기반)
- `isSafeRelativePath()` — 경로 안전성 검증 (URL 허용, 절대 경로 차단, `../` 탈출 차단)
- `extractPathValues()` — 매니페스트 필드에서 경로 값 추출 (문자열, 배열, 객체 지원)
- `resolveMarketplaceSource()` — `metadata.pluginRoot` 기준 소스 경로 해석

---

## 3. Skill 공통 설계 패턴

모든 Skill에서 반복되는 설계 원칙:

| 패턴 | 설명 |
|---|---|
| **Human-in-the-loop** | 실행 전 반드시 사용자에게 결과/계획을 제시하고 확인을 받음 |
| **Frontmatter 메타데이터** | `name`, `description` 필드로 Skill 매칭 및 자동 트리거 |
| **키워드 기반 트리거** | `## Keywords` 섹션에 자연어 트리거 패턴 나열 |
| **단계별 워크플로우** | 명확한 Step 1~N 순차 워크플로우 정의 |
| **references/ 디렉토리** | 검색 패턴, 템플릿, 가이드 등 참조 자료를 별도 파일로 분리 |
| **MCP 도구 명시** | 각 단계에서 호출할 MCP 도구와 파라미터를 코드 블록으로 명시 |
| **엣지 케이스 처리** | 정보 부족, 다중 결과, 실패 시나리오별 대응 방안 정의 |
| **출력 포맷 표준화** | 성공/실패/중간 결과의 출력 포맷을 마크다운 예시로 정의 |
| **상호 배타성** | 각 Skill은 `## When NOT to Use` 섹션으로 다른 Skill과의 경계 명시 |

---

## 4. Skill 간 관계

```
사용자 요청
  │
  ├─ 버그/에러 관련 ──────────→ triage-issue
  ├─ 회의록/액션 아이템 ──────→ capture-tasks-from-meeting-notes
  ├─ 상태 보고서/주간 업데이트 → generate-status-report
  ├─ 사내 정보 검색 ──────────→ search-company-knowledge
  └─ 스펙 문서→백로그 ────────→ spec-to-backlog
```

각 Skill은 `When NOT to Use` 섹션에서 상호 참조하며 경계를 명확히 한다:
- **triage-issue**: 기능 요청은 `spec-to-backlog`, 일반 태스크 생성은 `capture-tasks`, 정보 검색은 `search-company-knowledge`로 안내
- **capture-tasks**: 회의 요약(태스크 생성 없이)이나 정보 검색에는 사용하지 않음
- **search-company-knowledge**: 일반 기술 질문이나 외부 문서에는 사용하지 않음

---

## 5. 사용되는 Atlassian MCP 도구 목록

| 도구 | 사용 Skill | 용도 |
|---|---|---|
| `search` | search-company-knowledge | Rovo 교차 시스템 검색 (Confluence + Jira) |
| `searchJiraIssuesUsingJql` | triage-issue, generate-status-report, search-company-knowledge | JQL 기반 Jira 이슈 검색 |
| `searchConfluenceUsingCql` | search-company-knowledge | CQL 기반 Confluence 검색 |
| `getJiraIssue` | triage-issue, search-company-knowledge | Jira 이슈 상세 조회 |
| `createJiraIssue` | triage-issue, capture-tasks, spec-to-backlog | Jira 이슈 생성 |
| `addCommentToJiraIssue` | triage-issue | Jira 이슈에 코멘트 추가 |
| `lookupJiraAccountId` | capture-tasks | Jira 사용자 계정 ID 조회 |
| `getVisibleJiraProjects` | capture-tasks, spec-to-backlog | 접근 가능한 Jira 프로젝트 목록 |
| `getJiraProjectIssueTypesMetadata` | triage-issue, capture-tasks, spec-to-backlog | 프로젝트 이슈 유형 메타데이터 |
| `getJiraIssueTypeMetaWithFields` | triage-issue, spec-to-backlog | 이슈 유형별 필수 필드 조회 |
| `getConfluencePage` | capture-tasks, generate-status-report, search-company-knowledge, spec-to-backlog | Confluence 페이지 콘텐츠 조회 |
| `getConfluenceSpaces` | generate-status-report | Confluence 스페이스 목록 |
| `createConfluencePage` | generate-status-report | Confluence 페이지 생성 |
| `updateConfluencePage` | generate-status-report | Confluence 페이지 업데이트 |
| `getAccessibleAtlassianResources` | (공통) | 접근 가능한 Atlassian 리소스 조회 |

---

## 6. imbas 참고 사항

이 레포지토리의 Skill 구조는 Claude Code 플러그인의 Skill 작성 패턴과 유사하되, 몇 가지 차이점이 있다:

| 측면 | Atlassian MCP Skills | Claude Code Plugin Skills |
|---|---|---|
| **Skill 정의** | `SKILL.md` (frontmatter: name, description) | `SKILL.md` (frontmatter: name, description) |
| **참조 자료** | `references/` 디렉토리에 별도 `.md` 파일 | 동일 패턴 가능 |
| **스크립트** | `scripts/` 디렉토리에 유틸리티 (Python, JS) | 스크립트 내장 가능 |
| **MCP 도구 호출** | Skill 본문에 도구 호출 예시를 코드 블록으로 기술 | 동일 패턴 |
| **검증** | `validate-template.mjs` (Cursor 플러그인 구조 검증) | `validate-plugin` skill |
| **마켓플레이스** | `.cursor-plugin/marketplace.json` (Cursor 마켓플레이스) | npm 배포 |
| **키워드 트리거** | `## Keywords` 섹션 | frontmatter `description`에 트리거 조건 기술 |
