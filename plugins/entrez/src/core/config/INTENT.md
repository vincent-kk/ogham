## Purpose

config.json(비밀 외)·credentials.json(api_key, 0o600) 로드·저장과 rate limit 판정. 비밀과 비밀 외 설정을 파일 분리한다.

## Structure

| 파일                             | 역할                                           |
| -------------------------------- | ---------------------------------------------- |
| `operations/loadConfig.ts`       | `loadConfig` — 없으면 null(미설정), 0o600 강화 |
| `operations/saveConfig.ts`       | `saveConfig` — zod 검증 후 0o600 기록          |
| `operations/loadCredentials.ts`  | `loadCredentials` — 없으면 {}, 0o600 강화      |
| `operations/saveCredentials.ts`  | `saveCredentials` — api_key 0o600 기록         |
| `operations/resolveRateLimit.ts` | `resolveRateLimit` — 키 유무→3/10 per sec      |

## Conventions

- 읽기·쓰기 모두 zod 스키마(`EntrezConfig`/`EntrezCredentials`)로 검증.
- 경로는 `constants/paths`에서만(`CONFIG_PATH`·`CREDENTIALS_PATH`).

## Boundaries

### Always do

- credentials 파일은 0o600으로 기록하고 드리프트 시 chmod 강화.
- api_key는 **값**을 반환·로그하지 않고 존재 여부만 노출(resolveRateLimit).

### Ask first

- 저장 경로·포맷 변경(마이그레이션 영향), 스키마 필드 추가/제거.

### Never do

- mcp 레이어에서 직접 import(단방향: mcp → core).
- api_key 값을 직렬화·로그·응답에 노출.

## Dependencies

- `../../types/config` — zod 스키마·타입
- `../../constants/{paths,defaults}` — 경로·rate 상수
- `../../lib/fileIo` — `readJson`/`writeJson`
