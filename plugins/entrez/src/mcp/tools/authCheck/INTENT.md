## Purpose

`auth-check` 도구. 설정 상태(tool/email·api_key 존재)·EInfo 도달성·유효 rate를 보고한다. 미설정에서도 동작(configured:false). setup의 pre-flight·복구 진입점.

## Structure

| 파일 | 역할 |
| --- | --- |
| `authCheck.ts` | `runAuthCheck` — config/credentials 로드 + EInfo probe |
| `index.ts` | 배럴 |

## Conventions

- config/credentials를 직접 로드(미설정 허용 — buildToolContext 미사용).
- EInfo는 `einfo.fcgi`(retmode=json)로 도달성·dbList 확인.

## Boundaries

### Always do

- api_key는 **존재 여부**만 보고(`hasApiKey`), 값 비노출.
- probe 실패는 reachable:false로 흡수(throw 금지).

### Ask first

- reachability 판정 엔드포인트 변경.

### Never do

- api_key 값을 응답/로그에 노출. 핸들러가 httpClient 우회.

## Dependencies

- `../../../core/{config,sourceResolver,httpClient}` · `../../../utils/url`
- `../../../types/{tool,http,enums}` · `../../../constants/defaults`
