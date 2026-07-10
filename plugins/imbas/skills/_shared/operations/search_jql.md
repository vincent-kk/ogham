# [OP: search_jql]

Search for issues using JQL (Jira Query Language).

## Provider Resolution

The sections below document the Jira semantics. When a skill invokes this
operation without a provider-specific workflow file (e.g., `split`), resolve
by `config.provider`:

- `jira` — Jira MCP tool or REST endpoint below
- `github` — `gh issue list --repo <owner/repo> --label <type:label> --search "<terms>" --json number,title,labels,state`
- `local` — `Glob` over `.imbas/<KEY>/issues/**/*.md`, then `Grep` frontmatter/title for the search terms

## REST Endpoint

```
POST /rest/api/3/search/jql          # Cloud
GET  /rest/api/2/search?jql=...      # Server/DC
```

## Parameters

| Name         | Required | Description                                                |
| ------------ | -------- | ---------------------------------------------------------- |
| `jql`        | yes      | JQL query string (e.g., `project = PROJ AND type = Story`) |
| `fields`     | no       | Comma-separated field list                                 |
| `maxResults` | no       | Page size (default: 50, max: 100)                          |
| `startAt`    | no       | Pagination offset                                          |

## Response Fields (key subset)

- `issues[]` — Array of matching issues
- `total` — Total result count
- `maxResults` — Page size used
- `startAt` — Current offset

## Used By

- `split` — Search for existing related Stories/Epics
- `devplan` — Optional search for related existing issues
