# SPEC-provider-github — GitHub Issues Provider

> Status: Draft v1.3 (2026-07-10) — Implementation sync (`## Links` body sections, milestone 미채택)
> Parent: [SPEC-provider.md](./SPEC-provider.md)

---

## 1. Overview

GitHub Issues provider implementation for imbas. Uses `gh` CLI for all operations. No additional MCP server required.

### Prerequisites

- `gh` CLI installed and authenticated (`gh auth status`)
- Repository write access (issues, labels)
- Repository must have Issues enabled

---

## 2. Concept Mapping

### 2.1 Issue Hierarchy

| imbas Concept | GitHub Representation        | Notes                                                       |
| ------------- | ---------------------------- | ----------------------------------------------------------- |
| **Epic**      | Issue + `type:epic` label    | Tracking issue — task list(`## Sub-tasks`)로 하위 이슈 추적 |
| **Story**     | Issue + `type:story` label   | Epic tracking issue의 task list에 등록                      |
| **Task**      | Issue + `type:task` label    | Cross-story technical work                                  |
| **Subtask**   | Issue + `type:subtask` label | Referenced in parent's task list                            |
| **Bug**       | Issue + `type:bug` label     | Optional, for future use                                    |

### 2.2 Epic = Tracking Issue

Epic은 `type:epic` 라벨의 **tracking issue** 하나로 표현한다 — 하위 이슈는
본문의 `## Sub-tasks` task list로 추적한다.

```
#10 [type:epic] "소셜 로그인" (tracking issue)
  ├── #11 [type:story] "소셜 로그인으로 신규 가입"
  ├── #12 [type:story] "기존 계정 소셜 연동"
  └── #15 [type:task] "OAuth provider 추상화 레이어"
```

> **Milestone 미채택**: 초기 설계는 Epic = Milestone + Tracking Issue 병행이었으나,
> 구현은 tracking issue 단독으로 확정했다 (milestone 관리 오버헤드 대비 이득 없음).

### 2.3 Parent-Child Relationships

GitHub has no native parent-child. imbas uses a **`## Sub-tasks` task list** in the parent body:

```markdown
## Sub-tasks

- [ ] #11
- [ ] #12
- [ ] #15
```

When a child issue is closed, GitHub automatically checks the task list item.

### 2.4 `issue_ref` Storage Convention

In manifests and feedback targets, GitHub issue references are stored in
fully-qualified form:

- `owner/repo#42` : canonical stored `issue_ref`
- `#42` : allowed only as shorthand in same-repo body text or user-facing prose

### 2.5 Hierarchy Example

```
Issue #10 [type:epic, status:todo, imbas-managed]
  title: "소셜 로그인"
  body:
    ## Description
    소셜 계정을 이용한 회원가입/로그인 기능 구현

    ## Sub-tasks
    - [ ] #11
    - [ ] #12
    - [ ] #15

    ## Links

Issue #11 [type:story, status:todo, imbas-managed]
  title: "소셜 로그인으로 신규 가입"
  body:
    ## Description
    As a new user,
    I want to sign up via social accounts,
    so that I can skip manual registration.

    Given a user on the login page
    When they click "Sign up with Google"
    Then an account is created with their Google profile

    ## Sub-tasks
    - [ ] #13
    - [ ] #14

    ## Links
    - blocked-by: #15

Issue #15 [type:task, status:todo, imbas-managed]
  title: "OAuth provider 추상화 레이어 구현"
  body:
    ## Description
    OAuth 인증 흐름을 추상화하여 복수 provider를 지원하는 공통 레이어 구현

    ## Sub-tasks
    - [ ] #16
    - [ ] #17

    ## Links
    - blocks: #11, #12
```

---

## 3. Label System

### 3.1 Label Categories

| Category      | Labels                                                                                         | Purpose                                        |
| ------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Type**      | `type:epic`, `type:story`, `type:task`, `type:subtask`, `type:bug`                             | Issue type classification                      |
| **Status**    | `status:todo`, `status:ready-for-dev`, `status:in-progress`, `status:in-review`, `status:done` | Workflow state                                 |
| **Managed**   | `config.labels.managed` (기본 `imbas-managed`)                                                 | Identifies imbas-managed issues                |
| **Lifecycle** | `config.labels.*` (review-pending, review-complete, dev_waiting 등)                            | Phase 경계 라이프사이클 마킹 (manifest Step 6) |

### 3.2 Label Colors

단순화된 카테고리 색상을 사용한다 (라벨별 개별 색상은 미채택):

| Category                      | Hex      |
| ----------------------------- | -------- |
| `type:*`                      | `0075ca` |
| `status:*`                    | `e4e669` |
| lifecycle (`config.labels.*`) | `c5def5` |

### 3.3 Label Auto-Creation

두 지점에서 멱등 생성한다 (`gh label list` 로 존재 확인 후 누락분만 `gh label create`):

1. `imbas:setup init` Step 3.6 / `setup labels provision` — 라이프사이클 라벨 provisioning
2. `imbas:manifest` Step 0 (Label Bootstrap) — `gh issue create` 전에 type/status/managed/lifecycle 전체 검증·생성. 403 시 fail-fast (`gh auth refresh -s repo` 안내).

### 3.4 GitHub Config

GitHub provider settings live under `config.github`:

```json
{
  "github": {
    "repo": "owner/repo",
    "defaultLabels": [],
    "linkTypes": ["blocks", "blocked-by", "split-from", "split-into", "relates"]
  }
}
```

- `repo`: target repository for imbas-managed issues
- `defaultLabels`: extra labels added to every created issue
- `linkTypes`: allowed keys in the GitHub `## Links` section

Core workflow labels such as `type:*` and `status:*` remain fixed conventions
defined by the provider spec and label bootstrap step.

---

## 4. Body Sections (`## Sub-tasks`, `## Links`)

기계 판독 메타데이터는 HTML 주석 블록이 아니라 **고정 h2 바디 섹션**으로 저장한다.
(초기 설계의 `<!-- imbas:meta -->` 블록은 미채택 — 파서 구현: `src/providers/github/parsers/parseLinks.ts`,
프로토콜 정본: `skills/manifest/references/github/link-handling.md`.)

### 4.1 `## Links` Grammar

```markdown
## Links

- blocks: #123
- blocks: owner/repo#45
- blocked-by: #7
- split-from: #2
- split-into: #8, #9
- relates: #12, #14
```

파싱/쓰기 규칙:

1. 헤더는 리터럴 `## Links` (h2). 섹션 부재 → `{}`.
2. 각 행: `- <linkType>: <refList>`.
3. `linkType` ∈ `{blocks, blocked-by, split-from, split-into, relates}` (`config.github.linkTypes` 기본값과 일치).
4. `refList`: `#N` 또는 `owner/repo#N` 콤마 구분 목록.
5. 중복 `linkType` 키는 병합(refs union), 미지의 linkType 은 경고(forward-compat).

### 4.2 Bidirectional Write

A가 X 타입으로 B를 가리키면 B에는 역방향 타입을 기록한다:

| Source (A → B) | Reverse (B → A) |
| -------------- | --------------- |
| `blocks`       | `blocked-by`    |
| `blocked-by`   | `blocks`        |
| `split-from`   | `split-into`    |
| `split-into`   | `split-from`    |
| `relates`      | `relates`       |

한쪽 PATCH 실패 시 다른 쪽을 롤백하지 않고 실패를 보고한다.

### 4.3 `## Sub-tasks` Task List

부모 이슈 본문의 `## Sub-tasks` 섹션에 `- [ ] #N` 체크박스로 자식을 등록한다.
자식 생성 후 부모 본문을 read-then-write 로 PATCH (`gh api repos/<o/r>/issues/<N> --method PATCH -f body=...`).
동일 엔트리 존재 시 append 스킵 (멱등).

### 4.4 Body Update Protocol

1. Read current body: `gh issue view <num> --json body -q .body`
2. 해당 섹션(`## Links` / `## Sub-tasks`) 부재 시 append, 존재 시 항목 추가
3. Update via `gh api` PATCH

**Important**: 섹션 외 사용자 콘텐츠는 보존한다. read-then-write 로 동시 편집 클로버링을 방지한다.

---

## 5. gh CLI Command Patterns

### 5.1 Issue Creation

```bash
# Story creation
gh issue create \
  --repo "owner/repo" \
  --title "소셜 로그인으로 신규 가입" \
  --body "$(cat <<'BODY'
## Description

As a new user,
I want to sign up via social accounts,
so that I can skip manual registration.

Given a user on the login page
When they click "Sign up with Google"
Then an account is created with their Google profile

## Sub-tasks

## Links
BODY
)" \
  --label "type:story" \
  --label "status:todo" \
  --label "imbas-managed"
```

**Output parsing**: `gh issue create` returns the issue URL. Extract number:

```bash
# Returns: https://github.com/owner/repo/issues/42
# Store as: owner/repo#42
```

### 5.2 Issue Query

```bash
# Get issue details as JSON
gh issue view 42 --repo "owner/repo" --json number,title,body,labels,state,comments

# Search issues by label
gh issue list --repo "owner/repo" \
  --label "type:story" \
  --label "imbas-managed" \
  --json number,title,labels,state \
  --limit 100

# Search by keyword
gh issue list --repo "owner/repo" \
  --search "OAuth in:title,body" \
  --label "type:task" \
  --json number,title,state
```

### 5.3 State Transition (Label Swap)

```bash
# todo → in_progress
gh issue edit 42 --repo "owner/repo" \
  --remove-label "status:todo" \
  --add-label "status:in-progress"

# → done (also close issue)
gh issue edit 42 --repo "owner/repo" \
  --remove-label "status:in-review" \
  --add-label "status:done"
gh issue close 42 --repo "owner/repo" --reason completed

# Horizontal split: original → done
gh issue edit 8 --repo "owner/repo" \
  --remove-label "status:todo" \
  --add-label "status:done"
gh issue close 8 --repo "owner/repo" --reason completed
```

### 5.4 Issue Linking (Body Edit)

```bash
# Read current body
BODY=$(gh issue view 42 --repo "owner/repo" --json body -q .body)

# Append `- <linkType>: <ref>` under ## Links (skill logic; §4.1 grammar)
UPDATED_BODY="..."

# Update
gh api repos/owner/repo/issues/42 --method PATCH -f body="$UPDATED_BODY"
```

역방향 엔트리를 target 이슈에도 기록한다 (§4.2).

### 5.5 Task List Management (Parent Body Update)

After creating child issue #13 under parent #11:

```bash
# Read parent body
PARENT_BODY=$(gh issue view 11 --repo "owner/repo" --json body -q .body)

# Add task list item (skill logic inserts under appropriate section)
# - [ ] #13 OAuth callback 처리

# Update parent
gh issue edit 11 --repo "owner/repo" --body "$UPDATED_PARENT_BODY"
```

### 5.6 Comment

```bash
gh issue comment 42 --repo "owner/repo" --body "$(cat <<'COMMENT'
<!-- imbas:digest v1 | generated: 2026-04-04T11:00:00+09:00 | comments_covered: 1-7 -->
## imbas Digest
...
<!-- /imbas:digest -->
COMMENT
)"
```

### 5.7 Label Operations

```bash
# List labels (existence check)
gh label list --repo "owner/repo" --json name

# Create only missing labels (idempotent bootstrap; §3.3)
gh label create "type:story" --repo "owner/repo" --color "0075ca"
```

---

## 6. Setup Workflow (GitHub)

`imbas:setup init` for GitHub provider:

```
Step 1 — Verify gh CLI
  - Bash: gh auth status
  - Failure → "Run `gh auth login` first"

Step 2 — Repository selection
  - User provides owner/repo or auto-detect from git remote
  - Bash: gh repo view owner/repo --json name,owner
  - Validate repo exists and has Issues enabled

Step 3 — Label configuration & provisioning
  - config.labels 기본값 확인/커스터마이즈 (managed, review-pending 등)
  - 사용자 동의 시 라이프사이클 라벨 provisioning (§3.3; 존재 확인 후 누락분만 생성)
  - type:/status: 라벨은 manifest Step 0 (Label Bootstrap)에서도 재검증

Step 4 — config.json creation
  - provider: "github"
  - github: { repo: "owner/repo", defaultLabels: [], linkTypes: [...] }
  - labels: { managed: "imbas-managed", ... } (top-level lifecycle labels)
  - defaults.project_ref: "owner/repo"

Step 5 — Cache initialization
  - Fetch repo meta → project-meta.json
  - Fetch label list → issue-types.json
  - Write link convention → link-types.json (fixed)
  - Write status label map → workflows.json

Step 6 — .gitignore guard (same as Jira)

Step 7 — Result display
```

---

## 7. Execution Patterns (imbas:manifest)

### 7.1 stories-manifest Execution (GitHub)

```
Step 0 — Label Bootstrap
  gh label list → 누락 라벨 생성 (type:/status:/managed/lifecycle; §3.3)
  403 → fail-fast (blocked)

Phase 4a — Create Epic Tracking Issue (필요 시)
  gh issue create --label type:epic --label status:todo --label <config.labels.managed>
  → epic_ref: owner/repo#10 → save manifest

Phase 4b — Create Stories (sequential, with immediate state save)
  for each story where status == "pending":
    gh issue create --label type:story --label status:todo --label <config.labels.managed>
    → story.issue_ref = "owner/repo#11", story.status = "created"
    → Epic 존재 시 Epic 본문 ## Sub-tasks 에 `- [ ] #11` append (PATCH)
    → save manifest

Phase 4c — Process links
  for each link where status == "pending", for each target in link.to:
    source ## Links 에 `- <linkType>: <ref>` append + target 에 역방향 기록 (§4)
    link.status = created/partial/failed → save manifest

Phase 4d — Source issue transitions
  for each transition in manifest.transitions where status == "pending":
    gh issue view <N> --json state (이미 closed → skipped)
    gh issue close <N> --reason completed
    → transition.status 갱신 → save manifest
```

### 7.2 devplan-manifest Execution (GitHub)

execution_order 순서를 따른다:

```
Step 1 — create_tasks
  gh issue create --label type:task --label status:todo --label <config.labels.managed>

Step 2 — create_task_subtasks
  gh issue create --label type:subtask ... → Task 본문 ## Sub-tasks append

Step 3 — create_links (task.blocks)
  Task ## Links: `- blocks: <story_ref>` / Story ## Links: `- blocked-by: <task_ref>`

Step 4 — create_story_subtasks
  gh issue create --label type:subtask ... → Story 본문 ## Sub-tasks append

Step 5 — add_feedback_comments
  gh issue comment <story-ref> --body-file -
```

이후 라이프사이클 라벨 전환(manifest Step 6) + digest 제안(Step 4.5)은
provider-agnostic 스켈레톤을 따른다.

### 7.3 Idempotency

Same as Jira: fully qualified `issue_ref` already set → skip. Resume-safe.

---

## 8. `imbas:read-issue` (GitHub)

```bash
# Full issue with comments
gh issue view 42 --repo "owner/repo" --json number,title,body,labels,state,milestone,comments,createdAt,updatedAt,author

# Parse comments array from JSON
# Each comment: { author: { login }, body, createdAt }
```

**digest marker detection**: Same HTML comment format as Jira. `<!-- imbas:digest v1 ... -->` in comment body.

**digest 편집 모델**: GitHub 전용 last-wins — `/imbas:digest --update` 시
`gh issue comment --edit-last` 로 최근 digest 코멘트를 덮어쓴다 (jira/local 은
keep-old-post-new). `imbas:read-issue` 는 최신 마커 코멘트를 우선한다.

---

## 9. Limitations vs Jira

| Feature                | Jira                     | GitHub                                   | Impact                                                          |
| ---------------------- | ------------------------ | ---------------------------------------- | --------------------------------------------------------------- |
| Native issue hierarchy | Epic → Story → Subtask   | Flat (labels + task lists)               | Task lists provide visual hierarchy but no enforced structure   |
| Workflow engine        | Transition rules, guards | None (any label swap allowed)            | More flexible but less guardrails                               |
| Custom fields          | Extensive                | None (body + labels only)                | Complex metadata goes in body sections (## Links, ## Sub-tasks) |
| Link types             | Native typed links       | Convention-based (## Links body section) | Parsing required, less discoverable                             |
| Subtask progress       | Native % complete        | Task list checkbox (native)              | GitHub task list progress is actually good                      |
| Search                 | JQL (powerful)           | Basic label/keyword filter               | May need `gh api` with GitHub Search API for complex queries    |

---

## Related

- [SPEC-provider.md](./SPEC-provider.md) — Abstract provider interface
- [SPEC-provider-jira.md](./SPEC-provider-jira.md) — Jira provider comparison
- [SPEC-skills.md](./SPEC-skills.md) — Provider를 호출하는 스킬 정의
- [SPEC-tools.md](./SPEC-tools.md) — imbas MCP 도구 정의
- [BLUEPRINT.md](../BLUEPRINT.md) — Architecture overview
