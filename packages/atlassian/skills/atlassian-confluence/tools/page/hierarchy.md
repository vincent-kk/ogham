# Page Hierarchy

## Get Ancestors (Breadcrumb)

```
Tool: fetch (method: GET)
Endpoint: /wiki/rest/api/content/{id}?expand=ancestors
```

## Get Descendants

```
Tool: fetch (method: GET)
Endpoint: /wiki/rest/api/content/{id}/descendant/page
```

## Get Child Pages (Direct)

```
Tool: fetch (method: GET)
Cloud V1: /wiki/rest/api/content/{id}/child/page
Cloud V2: /api/v2/pages/{id}/children
```

## Move Page

```
Tool: fetch (method: PUT)
Endpoint: /wiki/rest/api/content/{id}/move/{position}/{targetId}
```

Positions: `before`, `after`, `append` (as child)

**Note**: Page move uses V1 API only — V2 does not support move.
