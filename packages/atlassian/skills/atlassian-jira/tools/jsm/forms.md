# ProForma Forms

## Get Forms for Request

```
Tool: get
Endpoint: /rest/servicedeskapi/request/{issueIdOrKey}/form
```

## Submit Form Answer

```
Tool: put
Endpoint: /rest/servicedeskapi/request/{issueIdOrKey}/form/{formId}
Body: { "answers": { "questionId": "answer value" } }
```

## Notes

- ProForma forms are available in JSM Premium/Enterprise
- Forms are linked to request types
- Each form has a set of questions with defined answer types
