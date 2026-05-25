# Auth Types Reference

## Basic Auth (Cloud)

- **Credentials**: Email address + API token
- **API Token**: Generate at https://id.atlassian.com/manage-profile/security/api-tokens
- **Header**: `Authorization: Basic base64(email:api_token)`
- **Scope**: Full access to all products the user has access to
- **Best for**: Personal use, CI/CD pipelines

## Basic Auth (Server/DC)

- **Credentials**: Username + password
- **Header**: `Authorization: Basic base64(username:password)`
- **Limitation**: May be disabled by admin policy

## Personal Access Token (Server/DC only)

- **Generate**: User Profile → Personal Access Tokens
- **Header**: `Authorization: Bearer {token}`
- **Scope**: Same permissions as the creating user
- **Best for**: Automated tools, CI/CD on Server/DC

## OAuth 2.0 (3LO)

- **Platforms**: Cloud and Server/DC
- **Flow**: Authorization code grant with PKCE
- **Tokens**: Access token (short-lived) + refresh token (long-lived)
- **Scope**: Granular — request only needed scopes
- **Best for**: Multi-user apps, fine-grained access control

## Recommendation

| Use Case | Recommended Auth |
|---|---|
| Personal Cloud use | Basic (API token) |
| Personal Server/DC use | PAT |
| CI/CD pipeline | Basic or PAT |
| Multi-user application | OAuth 2.0 |
