## Purpose

`~/.claude/plugins/cennad/config.json` 로드·저장 담당. `CENNAD_CONFIG_PATH` 가 있으면 해당 cennad 전용 디렉터리를 active home 으로 사용한다. active config 가 없거나 JSON/object 로 읽을 수 없고 active home 이 기본 home 이 아니면 `pluginCache('cennad')/config.json` 만 읽기 전용 fallback source 로 시도한다. fallback 은 파일을 생성·복사하지 않으며 save 는 항상 active `CONFIG_PATH` 로 간다. Zod 검증 실패와 merge/normalize 가능 구형 config 는 `DEFAULT_CONFIG`/normalize 경로로 처리한다. legacy 정수 비율 → enabled flag 마이그레이션, `/setup` 진입 시 `pruneConfigFile` 로 구 키 제거·기본값 보완, `model_map` deep merge(`mergeModelMap`) 포함.

## Structure

| 파일                                       | 역할                                                                                                                       |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `operations/loadConfig.ts`·`saveConfig.ts` | load: active read + optional read-only fallback + mergeWithDefaults + Zod · save: ConfigSchema.parse 재검증 후 atomicWrite |
| `utils/mergeWithDefaults.ts`               | raw 객체와 DEFAULT_CONFIG deep merge (전 pipeline 조율)                                                                    |
| `utils/mergeModelMap.ts`                   | raw model_map + defaults 병합 (codex·claude tier `{model,effort}`, antigravity tier 모델명)                                |
| `utils/mergeDefaultTier.ts`                | raw default_tier + DEFAULT_CONFIG.default_tier provider별 병합                                                             |
| `utils/mergePreamble.ts`                   | raw → PreambleConfig (provider별 문자열, 기본값 fallback)                                                                  |
| `utils/mergeRecencyFactor.ts`              | raw → RecencyFactorConfig (off/auto/strict 검증)                                                                           |
| `utils/normalizeRatio.ts`                  | legacy 정수 비율 → enabled boolean 정규화                                                                                  |
| `utils/isPlainObject.ts`                   | plain-object guard (deep merge 전처리)                                                                                     |
| `index.ts`                                 | barrel: loadConfig, saveConfig                                                                                             |

## Conventions

- 디스크 JSON 키 snake_case; 함수·변수 camelCase
- defaults 출처는 `constants/defaults.ts` 단독 신뢰
- active 파일 누락·JSON 파싱 실패·top-level non-object → 기본 home config read-only fallback, 실패 시 DEFAULT_CONFIG

## Boundaries

### Always do

- Zod 검증 실패 시 DEFAULT_CONFIG fallback + logger.warn 기록
- `CLAUDE_PLUGIN_DATA`/`CLAUDE_PLUGIN_DADA` 는 home 결정이나 fallback source 로 사용하지 않음
- saveConfig 저장 전 ConfigSchema.parse 로 재검증
- `/setup` 진입 시 `pruneConfigFile` 로 제거된 provider 키·legacy 값 정리 후 DEFAULT_CONFIG 보완

### Ask first

- 새 config 키 추가 또는 ConfigSchema 스키마 변경
- mergeWithDefaults deep-merge 전략 또는 pruneConfigFile 프루닝 정책 변경

### Never do

- fs.writeFile 직접 호출 — 반드시 atomicWrite 사용
- 검증 실패 config 를 throw 하거나 상위로 전파
- DEFAULT_CONFIG 이외의 하드코딩 기본값 사용

## Dependencies

- `node:fs/promises`, `../../lib/atomicWrite`, `../../lib/logger`
- `../../constants/paths`, `../../constants/defaults`
- `../../types` (Config, ConfigSchema), `../../utils/isFileNotFound`
