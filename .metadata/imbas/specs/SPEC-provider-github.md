# SPEC-provider-github — GitHub Issues Provider

> Status: Draft v1.2 (2026-04-06)
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

| imbas Concept | GitHub Representation | Notes |
|---------------|----------------------|-------|
| **Epic** | Issue + `type:epic` label + **Milestone** | Milestone groups related stories. Epic issue contains task list for tracking. |
| **Story** | Issue + `type:story` label | Assigned to Epic's milestone |
| **Task** | Issue + `type:task` label | Cross-story technical work. Assigned to same milestone. |
| **Subtask** | Issue + `type:subtask` label | Referenced in parent's task list |
| **Bug** | Issue + `type:bug` label | Optional, for future use |

### 2.2 Epic = Milestone + Tracking Issue

An Epic maps to **both**:

1. **Milestone** — provides native GitHub grouping, progress tracking, filtering
2. **Tracking Issue** — provides task list for visual hierarchy, detailed description

```
Milestone: "소셜 로그인"
  ├── #10 [type:epic] "소셜 로그인" (tracking issue)
  ├── #11 [type:story] "소셜 로그인으로 신규 가입"
  ├── #12 [type:story] "기존 계정 소셜 연동"
  └── #15 [type:task] "OAuth provider 추상화 레이어"
```

**Milestone creation**: `gh api` to create milestone, then assign all child issues.

```bash
# Create milestone
gh api repos/{owner}/{repo}/milestones -f title="소셜 로그인" -f description="Epic: 소셜 로그인 기능 구현"

# Assign issue to milestone
gh issue edit 11 --milestone "소셜 로그인"
```

### 2.3 Parent-Child Relationships

GitHub has no native parent-child. imbas uses **task lists** in parent body:

```markdown
## Stories
- [ ] #11 소셜 로그인으로 신규 가입
- [ ] #12 기존 계정 소셜 연동

## Tasks
- [ ] #15 OAuth provider 추상화 레이어
```

When a child issue is closed, GitHub automatically checks the task list item.

### 2.4 `issue_ref` Storage Convention

In manifests and feedback targets, GitHub issue references are stored in
fully-qualified form:

- `owner/repo#42` : canonical stored `issue_ref`
- `#42` : allowed only as shorthand in same-repo body text or user-facing prose

### 2.5 Hierarchy Example

```
Issue #10 [type:epic, status:todo, imbas]
  title: "소셜 로그인"
  milestone: "소셜 로그인"
  body:
    ## Overview
    소셜 계정을 이용한 회원가입/로그인 기능 구현

    ## Stories
    - [ ] #11 소셜 로그인으로 신규 가입
    - [ ] #12 기존 계정 소셜 연동

    ## Tasks
    - [ ] #15 OAuth provider 추상화 레이어

    <!-- imbas:meta
    type: epic
    milestone: 소셜 로그인
    -->

Issue #11 [type:story, status:todo, imbas]
  title: "소셜 로그인으로 신규 가입"
  milestone: "소셜 로그인"
  body:
    ## User Story
    As a new user,
    I want to sign up via social accounts,
    so that I can skip manual registration.

    ## Acceptance Criteria
    Given a user on the login page
    When they click "Sign up with Google"
    Then an account is created with their Google profile

    ## Subtasks
    - [ ] #13 OAuth callback 처리
    - [ ] #14 사용자 계정 생성

    <!-- imbas:meta
    type: story
    parent: #10
    is_blocked_by: #15
    -->

Issue #15 [type:task, status:todo, imbas]
  title: "OAuth provider 추상화 레이어 구현"
  milestone: "소셜 로그인"
  body:
    ## Description
    OAuth 인증 흐름을 추상화하여 복수 provider를 지원하는 공통 레이어 구현

    ## Subtasks
    - [ ] #16 provider 인터페이스 정의
    - [ ] #17 Google OAuth 구현

    <!-- imbas:meta
    type: task
    parent: #10
    blocks: #11, #12
    -->
```

---

## 3. Label System

### 3.1 Label Categories

| Category | Labels | Purpose |
|----------|--------|---------|
| **Type** | `type:epic`, `type:story`, `type:task`, `type:subtask`, `type:bug` | Issue type classification |
| **Status** | `status:todo`, `status:ready-for-dev`, `status:in-progress`, `status:in-review`, `status:done` | Workflow state |
| **imbas** | `imbas` | Identifies imbas-managed issues |

### 3.2 Label Colors

| Label | Color | Hex |
|-------|-------|-----|
| `type:epic` | Green | `#0E8A16` |
| `type:story` | Blue | `#1D76DB` |
| `type:task` | Yellow | `#FBCA04` |
| `type:subtask` | Light Blue | `#C5DEF5` |
| `type:bug` | Red | `#D73A4A` |
| `status:todo` | Light Gray | `#EDEDED` |
| `status:ready-for-dev` | Light Blue | `#BFD4F2` |
| `status:in-progress` | Blue | `#0075CA` |
| `status:in-review` | Light Red | `#E99695` |
| `status:done` | Green | `#0E8A16` |
| `imbas` | Purple | `#5319E7` |

### 3.3 Label Auto-Creation

`imbas:setup init` (GitHub provider) creates all labels if missing:

```bash
gh label create "type:epic" --color "0E8A16" --description "imbas Epic" --force
gh label create "type:story" --color "1D76DB" --description "imbas Story" --force
# ... (all labels)
```

`--force` flag updates existing labels without error.

### 3.4 GitHub Config

GitHub provider settings live under `config.github`:

```json
{
  "github": {
    "repo": "owner/repo",
    "defaultLabels": ["imbas"],
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

## 4. Body Meta Block

### 4.1 Format

Machine-readable metadata is embedded as an HTML comment block at the end of the issue body:

```markdown
<!-- imbas:meta
type: story
parent: #10
blocks: #15, #16
is_blocked_by: #20
split_from: #8
split_into: #21, #22
relates_to: #30
-->
```

### 4.2 Fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Issue type (epic, story, task, subtask) |
| `parent` | issue ref | Parent issue reference |
| `blocks` | issue ref list | Issues this blocks |
| `is_blocked_by` | issue ref list | Issues blocking this |
| `split_from` | issue ref | Original issue before split |
| `split_into` | issue ref list | Issues created by splitting this |
| `relates_to` | issue ref list | Related issues (umbrella pattern) |
| `milestone` | string | Milestone name (on epic tracking issues) |

### 4.3 Parsing Rules

1. Find `<!-- imbas:meta` ... `-->` block in body
2. Parse as YAML-like key-value pairs
3. Issue refs in body/meta blocks may use `#N` shorthand or `owner/repo#N`,
   comma-separated for lists
4. Missing fields = not applicable (no default values)

### 4.4 Body Update Protocol

When adding/modifying meta block:
1. Read current body: `gh issue view <num> --json body -q .body`
2. If `<!-- imbas:meta` exists: replace entire block
3. If not exists: append `\n\n---\n` + meta block
4. Update: `gh issue edit <num> --body "<updated>"`

**Important**: Preserve all user content above the meta block. Only modify the `<!-- imbas:meta -->` section.

---

## 5. gh CLI Command Patterns

### 5.1 Issue Creation

```bash
# Story creation
gh issue create \
  --repo "owner/repo" \
  --title "소셜 로그인으로 신규 가입" \
  --body "$(cat <<'BODY'
## User Story

As a new user,
I want to sign up via social accounts,
so that I can skip manual registration.

## Acceptance Criteria

Given a user on the login page
When they click "Sign up with Google"
Then an account is created with their Google profile

<!-- imbas:meta
type: story
parent: #10
-->
BODY
)" \
  --label "type:story" \
  --label "status:todo" \
  --label "imbas" \
  --milestone "소셜 로그인"
```

**Output parsing**: `gh issue create` returns the issue URL. Extract number:
```bash
# Returns: https://github.com/owner/repo/issues/42
# Store as: owner/repo#42
```

### 5.2 Issue Query

```bash
# Get issue details as JSON
gh issue view 42 --repo "owner/repo" --json number,title,body,labels,state,milestone,comments

# Search issues by label
gh issue list --repo "owner/repo" \
  --label "type:story" \
  --label "imbas" \
  --milestone "소셜 로그인" \
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

# Append/update meta block (handled by skill logic)
UPDATED_BODY="..."

# Update
gh issue edit 42 --repo "owner/repo" --body "$UPDATED_BODY"
```

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
<!-- /imbas:imbas-digest -->
COMMENT
)"
```

### 5.7 Milestone Management

```bash
# Create milestone
gh api repos/{owner}/{repo}/milestones \
  -f title="소셜 로그인" \
  -f description="Epic: 소셜 로그인 기능 구현" \
  -f state="open"

# List milestones
gh api repos/{owner}/{repo}/milestones --jq '.[].title'

# Close milestone (when Epic is done)
MILESTONE_NUM=$(gh api repos/{owner}/{repo}/milestones --jq '.[] | select(.title=="소셜 로그인") | .number')
gh api repos/{owner}/{repo}/milestones/$MILESTONE_NUM -X PATCH -f state="closed"
```

### 5.8 Label Operations

```bash
# Create label (idempotent with --force)
gh label create "type:story" --repo "owner/repo" --color "1D76DB" --description "imbas Story" --force

# List labels
gh label list --repo "owner/repo" --json name,color,description

# Check if label exists
gh label list --repo "owner/repo" --json name -q '.[].name' | grep -q "type:story"
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

Step 3 — Label creation
  - Create all type: and status: labels (§3.3)
  - Create imbas tracking label
  - --force ensures idempotent

Step 4 — config.json creation
  - provider: "github"
  - github.repo: "owner/repo"
  - github.labels: default mapping
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
Step 1 — Create Milestone (if Epic is new)
  gh api repos/{owner}/{repo}/milestones -f title="..." -f description="..."

Step 2 — Create Epic Tracking Issue
  gh issue create --label type:epic --label status:todo --label imbas --milestone "..."
  → issue_ref: owner/repo#10

Step 3 — Create Stories (sequential, with immediate state save)
  for each story where status == "pending":
    gh issue create --label type:story --label status:todo --label imbas --milestone "..."
    → story.issue_ref = "owner/repo#11"
    → story.status = "created"
    → save manifest

Step 4 — Update Epic task list
  Read Epic body → append story refs to task list → gh issue edit

Step 5 — Process links
  for each link where status == "pending":
    Read target body → add/update meta block → gh issue edit
    link.status = "created"
    save manifest

Step 6 — Horizontal split: close original
  gh issue edit <ref> --remove-label status:todo --add-label status:done
  gh issue close <ref> --reason completed
```

### 7.2 devplan-manifest Execution (GitHub)

```
Step 1 — Create Tasks
  gh issue create --label type:task --label status:todo --label imbas --milestone "..."

Step 2 — Create Task Subtasks
  gh issue create --label type:subtask --label status:todo --label imbas
  → Update Task body task list

Step 3 — Create blocking links
  For each Task → blocked Stories:
    Update Story meta block: add is_blocked_by
    Update Task meta block: add blocks

Step 4 — Create Story Subtasks
  gh issue create --label type:subtask --label status:todo --label imbas
  → Update Story body task list

Step 5 — Post B→A feedback comments
  gh issue comment <story-ref> --body "..."

Step 6 — Update Epic tracking issue task list (add Tasks)
```

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

---

## 9. Limitations vs Jira

| Feature | Jira | GitHub | Impact |
|---------|------|--------|--------|
| Native issue hierarchy | Epic → Story → Subtask | Flat (labels + task lists) | Task lists provide visual hierarchy but no enforced structure |
| Workflow engine | Transition rules, guards | None (any label swap allowed) | More flexible but less guardrails |
| Custom fields | Extensive | None (body + labels only) | Complex metadata goes in body meta block |
| Link types | Native typed links | Convention-based (meta block) | Parsing required, less discoverable |
| Subtask progress | Native % complete | Task list checkbox (native) | GitHub task list progress is actually good |
| Search | JQL (powerful) | Basic label/keyword filter | May need `gh api` with GitHub Search API for complex queries |

---

## Related

- [SPEC-provider.md](./SPEC-provider.md) — Abstract provider interface
- [SPEC-provider-jira.md](./SPEC-provider-jira.md) — Jira provider comparison
- [SPEC-state.md](./SPEC-state.md) — Config & state schemas
- [SPEC-skills.md](./SPEC-skills.md) — Provider를 호출하는 스킬 정의
- [SPEC-tools.md](./SPEC-tools.md) — imbas MCP 도구 정의
- [BLUEPRINT.md](../BLUEPRINT.md) — Architecture overview
