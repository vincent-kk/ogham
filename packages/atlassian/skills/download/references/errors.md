# Download Errors Reference

| Error | Cause | Resolution |
|---|---|---|
| 404 Not Found | Attachment deleted or wrong URL | Verify attachment still exists |
| 403 Forbidden | No download permission | Check project/space permissions |
| 413 Payload Too Large | Upload exceeds size limit | Check server max attachment size |
| Network timeout | Large file + slow connection | Increase timeout, retry |
| Invalid MIME type | Server rejected file type | Check allowed attachment types |
