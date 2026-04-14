# SPEC-atlassian-tools — Atlassian MCP 도구 검토

> **⚠ DEPRECATED** — 이 문서의 도구 이름(`getJiraIssue`, `createJiraIssue` 등)은
> 레거시 Python `mcp-atlassian` 서버 기준입니다. 현재 `[OP:]` 매핑은
> [SPEC-provider-jira.md](./SPEC-provider-jira.md)를 참조하세요.

> Status: Draft v1.0 (2026-04-04) — **DEPRECATED**
> Parent: [BLUEPRINT.md](../BLUEPRINT.md)

---

## 1. 기존 Atlassian MCP Skill 검토

### 대상: atlassian-mcp-server 5개 Skill

| Skill | imbas 필요 여부 | 판정 근거 |
|-------|----------------|----------|
| **spec-to-backlog** | ❌ 불필요 (대체됨) | imbas 자체가 이 기능의 상위 진화. 단순 "스펙→Epic+티켓" vs imbas의 "검증→분할→코드기반 devplan". 로직/템플릿의 일부는 참조 가치 있음 |
| **triage-issue** | ❌ 불필요 | 버그 트리아지는 imbas 워크플로우 범위 밖 |
| **capture-tasks-from-meeting-notes** | ❌ 불필요 | 회의록 파싱은 imbas 범위 밖 |
| **generate-status-report** | ⚠️ 부분 참조 | imbas 런 결과 리포트에 JQL 패턴/보고서 템플릿 참조 가능. 별도 스킬로 포함하지 않되, JQL 패턴을 references에 포함 |
| **search-company-knowledge** | ⚠️ 패턴 흡수 | Confluence/Jira 병렬 검색 패턴은 Phase 1(기존 스펙 검색) 및 Phase 3(관련 이슈 검색)에서 활용. 별도 스킬 아닌 에이전트 references에 패턴 포함 |

### 흡수할 참조 자료

spec-to-backlog에서:
- `references/epic-templates.md` — Epic Description 5종 템플릿 → imbas-planner references에 포함
- `references/ticket-writing-guide.md` — 티켓 작성 가이드 → imbas-planner references에 포함
- `references/breakdown-examples.md` — 분해 예시 → imbas-planner references에 포함

generate-status-report에서:
- `references/jql-patterns.md` — JQL 패턴 모음 → imbas-engineer references에 포함 (중복 검색용)

search-company-knowledge에서:
- 교차 시스템 검색 전략 → imbas-analyst references에 패턴 포함

---

## 2. 필요한 Atlassian MCP 도구

### 필수 (Core Workflow)

| 도구 | 사용 Phase/Skill | 용도 |
|------|-----------------|------|
| `createJiraIssue` | Phase 2, 3 / imbas:manifest | Epic, Story, Task, Subtask 생성 |
| `createIssueLink` | Phase 2, 3 / imbas:manifest | blocks, split-into 링크 생성 |
| `getJiraIssue` | Phase 2, 3 | 기존 이슈 조회, 검증 |
| `editJiraIssue` | Phase 2 / imbas:manifest | 수평 분할 시 원본 Story 상태 변경 |
| `searchJiraIssuesUsingJql` | Phase 3, cache | 중복 감지, 관련 이슈 탐색 |
| `addCommentToJiraIssue` | Phase 3 | B→A 피드백 코멘트 |
| `getTransitionsForJiraIssue` | imbas:manifest | 워크플로우 전환 가능 상태 조회 |
| `transitionJiraIssue` | imbas:manifest | 상태 전환 (수평 분할 시 Done) |

### 필수 (Setup & Cache)

| 도구 | 사용 Skill | 용도 |
|------|-----------|------|
| `getVisibleJiraProjects` | imbas:setup | 프로젝트 목록 조회 |
| `getJiraProjectIssueTypesMetadata` | imbas:setup, cache | 이슈 타입 메타데이터 |
| `getJiraIssueTypeMetaWithFields` | imbas:setup, cache | 이슈 타입별 필수 필드 |
| `getIssueLinkTypes` | imbas:setup, cache | 링크 타입 목록 |

### 선택 (Document Source)

| 도구 | 사용 Phase/Skill | 용도 |
|------|-----------------|------|
| `getConfluencePage` | Phase 1 | Confluence 기획 문서 읽기 |
| `searchConfluenceUsingCql` | Phase 1 | 관련 스펙 문서 탐색 |
| `fetchAtlassian` | imbas:fetch-media | 첨부 파일/이미지 다운로드 |

### 불필요

| 도구 | 미사용 근거 |
|------|-----------|
| `createConfluencePage` | imbas는 Confluence에 쓰지 않음 |
| `updateConfluencePage` | 동일 |
| `getConfluenceSpaces` | 스페이스 탐색 불필요 |
| `lookupJiraAccountId` | imbas는 담당자 할당 안 함 (사용자가 직접) |
| `addWorklogToJiraIssue` | 작업 로그 불필요 |
| `atlassianUserInfo` | 사용자 정보 불필요 |
| `getAccessibleAtlassianResources` | 초기 연결은 atlassian MCP 자체가 처리 |
| `getConfluencePageDescendants` | 페이지 트리 탐색 불필요 |
| `getConfluencePageFooterComments` | 코멘트 불필요 |
| `getConfluencePageInlineComments` | 코멘트 불필요 |
| `getConfluenceCommentChildren` | 코멘트 불필요 |
| `createConfluenceFooterComment` | Confluence에 쓰지 않음 |
| `createConfluenceInlineComment` | 동일 |
| `getPagesInConfluenceSpace` | 스페이스 탐색 불필요 |
| `getJiraIssueRemoteIssueLinks` | 원격 링크 불필요 |
| `searchAtlassian` | Rovo 검색 — CQL/JQL로 대체 |

---

## 3. 도구별 사용 패턴

### 3.1 이슈 생성 패턴 (createJiraIssue)

매니페스트 기반 배치 생성. 개별 호출이 아닌 매니페스트 순회:

```
for each item in manifest where status == "pending":
  1. createJiraIssue(project, type, summary, description, parent?)
  2. item.jira_key = result.key
  3. item.status = "created"
  4. save manifest (즉시 — 중단 시 복구용)
```

### 3.2 링크 생성 패턴 (createIssueLink)

이슈 생성 완료 후 일괄 링크:

```
for each link in manifest.links where status == "pending":
  // links[].to는 배열 — 1:N 수평 분할 대응
  for each target in link.to:
    1. resolve link.from → jira_key (manifest 참조)
    2. resolve target → jira_key (manifest 참조)
    3. createIssueLink(type, inwardIssue, outwardIssue)
  link.status = "created"
  save manifest
```

### 3.3 캐시 갱신 패턴

```
1. cached_at.json 확인
2. TTL 초과 시:
   a. getVisibleJiraProjects → project-meta.json
   b. getJiraProjectIssueTypesMetadata(key) → issue-types 기본
   c. 각 타입별 getJiraIssueTypeMetaWithFields → issue-types.json 상세
   d. getIssueLinkTypes → link-types.json
   e. cached_at.json 갱신
3. TTL 내: 캐시 사용
```

---

## 4. 도구 접근 제어

### 4.1 스킬 수준 — 워크플로우가 직접 사용하는 도구

| Skill | 읽기 도구 | 쓰기 도구 |
|-------|----------|----------|
| imbas:setup | getVisibleJiraProjects, getJiraProjectIssueTypesMetadata, getJiraIssueTypeMetaWithFields, getIssueLinkTypes | (없음) |
| imbas:validate | getConfluencePage, searchConfluenceUsingCql, getJiraIssue | (없음) |
| imbas:split | getJiraIssue, searchJiraIssuesUsingJql | (없음 — 매니페스트만 생성) |
| imbas:devplan | getJiraIssue, searchJiraIssuesUsingJql | (없음 — 매니페스트만 생성) |
| imbas:manifest | getJiraIssue, getTransitionsForJiraIssue | createJiraIssue, createIssueLink, editJiraIssue, transitionJiraIssue, addCommentToJiraIssue |
| imbas:fetch-media | getConfluencePage, fetchAtlassian | (없음) |

### 4.2 에이전트 수준 — 에이전트가 보유하는 도구

에이전트는 스킬보다 넓은 도구 세트를 보유할 수 있음. **스킬 프롬프트가 사용 시점을 제어** (Plan-then-Execute 원칙).

| Agent | 읽기 도구 | 쓰기 도구 | 비고 |
|-------|----------|----------|------|
| imbas-analyst | getConfluencePage, searchConfluenceUsingCql, getJiraIssue, searchJiraIssuesUsingJql | (없음) | Phase 1 검증 + Phase 2 역추론 |
| imbas-planner | searchJiraIssuesUsingJql, getJiraIssue, getJiraProjectIssueTypesMetadata | createJiraIssue, createIssueLink | 스킬이 매니페스트 생성만 지시 |
| imbas-engineer | getJiraIssue, getJiraIssueTypeMetaWithFields, searchJiraIssuesUsingJql | createJiraIssue, createIssueLink, addCommentToJiraIssue | 스킬이 매니페스트 생성만 지시 |
| ~~imbas-media~~ | — | — | *migrated to `@ogham/atlassian`* |

**핵심 원칙**: Phase 1-3 스킬은 원격 tracker에 쓰지 않음. 매니페스트만 생성. 실제 provider 쓰기(Jira/GitHub/local)는 `imbas:manifest`에서만 수행한다 (Plan-then-Execute 패턴). 에이전트가 쓰기 도구를 보유하더라도, 스킬 프롬프트가 매니페스트 생성만 지시하여 사용 시점을 제어함.

---

## Related

- [SPEC-skills.md](./SPEC-skills.md) — 도구를 사용하는 스킬 정의
- [SPEC-agents.md](./SPEC-agents.md) — 도구를 사용하는 에이전트
- [BLUEPRINT.md](../BLUEPRINT.md) — 전체 아키텍처
