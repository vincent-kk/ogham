## Purpose

`~/.claude/plugins/cogair/config.json` 로드·저장 담당. 파일 누락·Zod 검증 실패 시 세션을 차단하지 않고 `DEFAULT_CONFIG` 로 fallback. legacy 정수 비율 → enabled flag 마이그레이션 포함.

## Structure

| 파일                          | 역할                                                           |
| ----------------------------- | -------------------------------------------------------------- |
| `loadConfig.ts`               | 파일 read + `mergeWithDefaults` + Zod 검증 + defaults fallback |
| `saveConfig.ts`               | `ConfigSchema.parse` 재검증 후 `atomicWrite` 저장              |
| `utils/mergeWithDefaults.ts`  | raw 객체와 `DEFAULT_CONFIG` deep merge                         |
| `utils/mergePreamble.ts`      | raw → `PreambleConfig` (provider별 문자열, 기본값 fallback)    |
| `utils/mergeRecencyFactor.ts` | raw → `RecencyFactorConfig` (`off`/`auto`/`strict` 검증)       |
| `utils/normalizeRatio.ts`     | legacy 정수 비율 → enabled boolean 정규화                      |
| `utils/isPlainObject.ts`      | plain-object guard (deep merge 전처리)                         |
| `index.ts`                    | barrel: `loadConfig`, `saveConfig`                             |

## Conventions

- 디스크 JSON 키 snake_case; 함수·변수 camelCase
- defaults 출처는 `constants/defaults.ts` 단독 신뢰
- 파일 누락 시 `DEFAULT_CONFIG` 반환 (경고 없음 — 정상 최초 실행)
- 파싱·검증 실패 시 `logger.warn` 후 `DEFAULT_CONFIG` 반환
- 모든 write 는 `atomicWrite` 경유 (tmp → rename)

## Boundaries

### Always do

- Zod 검증 실패 시 `DEFAULT_CONFIG` fallback + `logger.warn` 기록
- `saveConfig` 저장 전 `ConfigSchema.parse` 로 재검증

### Ask first

- 새 config 키 추가 또는 `ConfigSchema` 스키마 변경
- `mergeWithDefaults` deep-merge 전략 변경

### Never do

- `fs.writeFile` 직접 호출 — 반드시 `atomicWrite` 사용
- 검증 실패 config 를 throw 하거나 상위로 전파
- `DEFAULT_CONFIG` 이외의 하드코딩 기본값 사용

## Dependencies

- `node:fs/promises`
- `../../lib/atomicWrite`, `../../lib/logger`
- `../../constants/paths` (`CONFIG_PATH`), `../../constants/defaults` (`DEFAULT_CONFIG`)
- `../../types` (`Config`, `ConfigSchema`), `../../utils/isFileNotFound`
