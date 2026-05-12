# Page Hierarchy

V2-style logical paths only — MCP rewrites to V1/DC form automatically.

## Get Child Pages (Direct)

```
Tool: fetch (method: GET)
Endpoint: /pages/{id}/children
```

## Get Ancestors (Breadcrumb)

V1/DC: fetch the page with `expand=ancestors` query parameter:
```
Tool: fetch (method: GET)
Endpoint: /pages/{id}?expand=ancestors
```

Cloud V2 returns `parentId` directly on the page object — walk it iteratively for full breadcrumb.

## Get Descendants (V1/DC only)

```
Tool: fetch (method: GET)
Endpoint: /pages/{id}/descendants
```

MCP rewrites to `/content/{id}/descendant/page` on DC. Cloud V2 has no descendants endpoint — recurse via `/pages/{id}/children` instead.

## Move Page

```
Tool: fetch (method: PUT)
Endpoint: /pages/{id}/move/{position}/{targetId}
```

Positions: `before`, `after`, `append` (as child). MCP rewrites to `/content/{id}/move/{position}/{targetId}` on DC. For Cloud V2, prefer updating the page with a new `parentId` instead (move endpoint absent in V2).
