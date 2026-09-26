# connect — Reference

The persisted `data-sources.json` contract for the connect skill.

## data-sources.json Schema

Create/update `.maencof-meta/data-sources.json`.

```json
{
  "sources": [
    {
      "id": "github-main",
      "type": "github",
      "enabled": true,
      "schedule": "session",
      "config": {
        "repo": "vincent-kk/ogham",
        "collect": ["issues", "prs"]
      },
      "last_collected": null,
      "created_at": "2026-02-28T10:00:00Z"
    }
  ],
  "updated_at": "2026-02-28T10:00:00Z"
}
```
