# Setup Errors Reference

## Connection Errors

| Error | Cause | Resolution |
|---|---|---|
| `ECONNREFUSED` | Server not reachable | Check URL, VPN, firewall |
| `ENOTFOUND` | DNS resolution failed | Verify hostname spelling |
| `CERT_ERROR` | SSL certificate invalid | Set `ssl_verify: false` for self-signed certs |
| `ETIMEDOUT` | Connection timeout | Check network, increase timeout |

## Auth Errors

| Error | Cause | Resolution |
|---|---|---|
| 401 Unauthorized | Wrong credentials | Re-enter API token/password |
| 403 Forbidden | Account lacks permissions | Check user permissions in admin |
| 403 + CAPTCHA | Too many failed attempts | Login via browser to clear CAPTCHA |

## OAuth Errors

| Error | Cause | Resolution |
|---|---|---|
| `invalid_grant` | Refresh token expired | Re-authorize from scratch |
| `invalid_client` | Wrong client ID/secret | Verify OAuth app configuration |
| `access_denied` | User denied consent | Retry authorization flow |
