# SLA Calculation

## Get SLA Info

```
Tool: fetch (method: GET)
Endpoint: /rest/servicedeskapi/request/{issueIdOrKey}/sla
```

## Response Fields

| Field | Description |
|---|---|
| `name` | SLA name (e.g., "Time to First Response") |
| `completedCycles` | Past SLA cycles with breach/success |
| `ongoingCycle.remainingTime` | Time remaining in current cycle |
| `ongoingCycle.breached` | Whether SLA is already breached |

## Working Hours

SLA calculations respect the service desk's working hours calendar.
Working hours are configured in Jira admin, not via API.
