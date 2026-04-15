[filid:lang:ko]

## Purpose

Atlassian 플러그인 설정 파일(config.json)의 로드·저장·병합을 Zod 검증과 함께 제공한다.

## Structure

| 파일 | 역할 |
|---|---|
| `config-manager.ts` | `loadConfig`, `saveConfig`, `mergeConfig` 구현 |
| `index.ts` | 배럴 재내보내기 |

## Boundaries

### Always do

- `AtlassianConfigSchema`(Zod)로 읽기·쓰기 모두 파싱하여 스키마 일관성을 보장한다.
- 설정 파일 부재 시 빈 기본값을 반환하고, 그 외 오류는 상위로 전파한다.
- `mergeConfig`는 얕은 병합 후 스키마 파싱으로 유효성을 재확인한다.
- index.ts 배럴을 통해서만 외부에 심볼을 노출한다.

### Ask first

- `AtlassianConfig` 스키마 구조(필드 추가·제거) 변경.
- 설정 파일 기본 경로(`CONFIG_PATH`) 정책 변경.

### Never do

- mcp/ 레이어에서 import하지 않는다 (단방향: mcp → core).
- Zod 검증을 생략한 채 설정 객체를 디스크에 쓰지 않는다.
- 다른 core 모듈의 상태를 이 모듈 내부에서 직접 변경하지 않는다.

## Dependencies

| 대상 | 이유 |
|---|---|
| `../../types/` | `AtlassianConfig`, `AtlassianConfigSchema` |
| `../../constants/` | `CONFIG_PATH` 기본 경로 |
| `../../lib/file-io` | `readJson`, `writeJson` |
