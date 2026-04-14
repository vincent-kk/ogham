# JSM Comment Handling

## Cloud vs Server

- **Cloud**: Standard comment API works for JSM. Use `visibility` property for internal comments.
- **Server/DC**: Dedicated Service Desk API required for customer-visible comments.

## Internal vs External Comments

```json
// Internal (agents only)
{
  "body": "Internal note",
  "visibility": {
    "type": "role",
    "value": "Service Desk Team"
  }
}

// External (customer-visible)
{
  "body": "Reply to customer"
  // No visibility property = public
}
```

## Server/DC Service Desk API

```
POST /rest/servicedeskapi/request/{issueIdOrKey}/comment
Body: { "body": "text", "public": true/false }
```
