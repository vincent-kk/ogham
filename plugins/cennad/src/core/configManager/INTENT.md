## Purpose

Owns config loading and persistence across user and project layers; project overrides user, and saving targets only the selected layer. `CENNAD_CONFIG_PATH` selects the active user home. Missing or unreadable active config may use the default home as a read-only fallback; fallback never creates or copies files. Invalid config degrades to defaults, while readable legacy shapes normalize in memory, including integer ratios and model maps. Opening setup never rewrites user config; `pruneConfigFile` remains an explicit maintenance API.

## Structure

| 파일                                       | 역할                                                                                                                                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `operations/loadConfig.ts`·`saveConfig.ts` | load: active read + optional read-only fallback + mergeWithDefaults + Zod (`loadConfigByScope` 는 project 좌표를 끈 채 같은 로더를 다시 태워 레이어별 뷰를 만든다) · save: ConfigSchema.parse 재검증 후 atomicWrite |
| `utils/mergeWithDefaults.ts`               | raw 객체와 DEFAULT_CONFIG deep merge (전 pipeline 조율)                                                                                                                                                             |
| `utils/mergeModelMap.ts`                   | raw model_map + defaults 병합 (codex·claude tier `{model,effort}`, antigravity tier 모델명)                                                                                                                         |
| `utils/mergeDefaultTier.ts`                | raw default_tier + DEFAULT_CONFIG.default_tier provider별 병합                                                                                                                                                      |
| `utils/mergePreamble.ts`                   | raw → PreambleConfig (provider별 문자열, 기본값 fallback)                                                                                                                                                           |
| `utils/mergeRecencyFactor.ts`              | raw → RecencyFactorConfig (off/auto/strict 검증)                                                                                                                                                                    |
| `utils/normalizeRatio.ts`                  | legacy 정수 비율 → enabled boolean 정규화                                                                                                                                                                           |
| `utils/isPlainObject.ts`                   | plain-object guard (deep merge 전처리)                                                                                                                                                                              |
| `index.ts`                                 | barrel: loadConfig, saveConfig                                                                                                                                                                                      |

## Conventions

- 디스크 JSON 키 snake_case; 함수·변수 camelCase
- defaults 출처는 `constants/defaults.ts` 단독 신뢰
- active 파일 누락·JSON 파싱 실패·top-level non-object → 기본 home config read-only fallback, 실패 시 DEFAULT_CONFIG

## Boundaries

### Always do

- Zod 검증 실패 시 DEFAULT_CONFIG fallback + logger.warn 기록
- `CLAUDE_PLUGIN_DATA`/`CLAUDE_PLUGIN_DADA` 는 home 결정이나 fallback source 로 사용하지 않음
- 검증은 **병합 결과에만** 호출자가 수행 — project 레이어는 재정의한 키만 담아 단독으로 스키마를 통과할 수 없다. `saveConfig` 는 검증하지 않는 영속 프리미티브이며, 유일한 호출자인 `/save` 핸들러가 병합 미리보기를 검증하고 실패 시 호출하지 않는다
- Normalize setup reads in memory; write user config only through an explicitly selected user save or maintenance call.

### Ask first

- 새 config 키 추가 또는 ConfigSchema 스키마 변경
- mergeWithDefaults deep-merge 전략, 레이어 개수·우선순위 또는 pruneConfigFile 프루닝 정책 변경

### Never do

- fs.writeFile 직접 호출 — 반드시 atomicWrite 사용
- 검증 실패 config 를 throw 하거나 상위로 전파
- DEFAULT_CONFIG 이외의 하드코딩 기본값 사용
- 병합 결과를 어느 한 레이어에 되쓰기 — project 재정의가 user 기본값에 구워진다

## Dependencies

- `node:fs/promises`, `../../lib/atomicWrite`, `../../lib/logger`
- `../../constants/paths`, `../../constants/defaults`
- `../../types` (Config, ConfigSchema), `../../utils/isFileNotFound`
