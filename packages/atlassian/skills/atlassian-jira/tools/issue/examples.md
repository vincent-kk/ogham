# Issue Examples

## Create Issue

```
Tool: post
Params:
  endpoint: /rest/api/3/issue
  content_format: "markdown"
  body:
    fields:
      project: { key: "PROJ" }
      issuetype: { name: "Task" }
      summary: "Fix login bug"
      description: "Users cannot login with SSO"
      priority: { name: "High" }
```

## Update Issue

```
Tool: put
Params:
  endpoint: /rest/api/3/issue/PROJ-123
  content_format: "markdown"
  body:
    fields:
      summary: "Updated summary"
      description: "Updated description in **markdown**"
```

## Get Issue

```
Tool: get
Params:
  endpoint: /rest/api/3/issue/PROJ-123
  expand: ["changelog", "renderedFields"]
```

## Delete Issue

```
Tool: delete
Params:
  endpoint: /rest/api/3/issue/PROJ-123
  query_params: { deleteSubtasks: "true" }
```
