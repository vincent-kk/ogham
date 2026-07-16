## Purpose

`config.json` 로드/저장 모듈. Zod 로 검증하고 atomic 하게 쓰며, 파일 부재·손상 시 기본값으로 degrade 한다.

## Structure

| File                          | Role                                                                       |
| ----------------------------- | -------------------------------------------------------------------------- |
| `operations/loadConfig.ts`    | `config.json` 읽기 + 검증 + 구버전 1회 마이그레이션(best-effort 재기록)    |
| `operations/saveConfig.ts`    | `CONFIG_VERSION` 스탬프 → `ConfigSchema.parse` → `atomicWrite` 로 영속     |
| `operations/migrateConfig.ts` | 버전별 마이그레이션 스텝 테이블 (`config_version` < `CONFIG_VERSION` 승격) |
| `index.ts`                    | barrel — `loadConfig`, `saveConfig` re-export                              |

## Conventions

- 디스크 경로는 `constants/paths` 의 `CONFIG_PATH` 고정
- 읽기 실패·검증 실패는 throw 하지 않고 `DEFAULT_CONFIG` 로 degrade (경고 로그)
- 쓰기는 항상 `lib/atomicWrite` (temp → rename), 2-space JSON + trailing newline
- `config_version` 부재 = 0(레거시); 스텝 수와 `CONFIG_VERSION` 불일치는 import 시 throw

## Boundaries

### Always do

- 영속 전 `ConfigSchema` 로 검증
- 손상·부재 config 는 기본값으로 degrade (로드는 절대 throw 안 함)

### Ask first

- config 스키마(`types/config`) 변경
- 디스크 경로 변경

### Never do

- 비검증 객체를 그대로 디스크에 쓰기
- 비원자적 쓰기 (직접 `writeFile`)
- 마이그레이션 스텝에서 live default 참조 (스텝은 리터럴로 동결)

## Dependencies

- `../../types/config` (`Config`, `ConfigSchema`), `../../constants`, `../../lib`, `../../utils`
- `node:fs/promises` (`readFile`)
