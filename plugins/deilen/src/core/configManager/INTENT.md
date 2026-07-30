## Purpose

`config.json` 로드/저장 모듈. user(전역)와 project(워크스페이스) 두 레이어를 병합해 읽고, 한 번에 한 레이어만 쓴다. Zod 검증은 병합 결과에만 걸고, 부재·손상 시 기본값으로 degrade 한다.

## Structure

| File                             | Role                                                      |
| -------------------------------- | --------------------------------------------------------- |
| `operations/loadConfig.ts`       | 두 레이어 읽기 → 마이그레이션 → 병합 → 검증               |
| `operations/loadConfigState.ts`  | 설정 페이지용 레이어별 원문 + 병합 + 재정의 목록          |
| `operations/saveConfig.ts`       | 한 레이어 원자적 영속 (user 에만 `CONFIG_VERSION` 스탬프) |
| `operations/migrateUserLayer.ts` | 레거시 user 레이어 승격과 best-effort 재기록              |
| `operations/migrateConfig.ts`    | 버전별 마이그레이션 스텝 테이블                           |
| `utils/configLayers.ts`          | 두 레이어 파일 좌표 해석 (organ)                          |
| `index.ts`                       | barrel                                                    |

## Conventions

- 레이어 좌표는 `@ogham/cross-platform` 의 `resolveConfigLayers` 가 정한다. user 는 `pluginCache('deilen')`, project 는 `<workspace>/.deilen/`.
- 우선순위는 `user < project`. 병합은 `mergeConfigLayers` 하나만 쓴다.
- 검증은 병합 결과에만 건다. project 는 재정의된 키만 담은 부분 문서라 단독으로 strict 스키마를 통과할 수 없다.
- 쓰기는 `writeConfigLayer` (`fileMode` 0o600, `directoryMode` 0o700), 2-space JSON + trailing newline.
- `config_version` 은 user 레이어만의 것이다. 부재 = 0(레거시).

## Boundaries

### Always do

- 손상·부재 config 는 기본값으로 degrade (로드는 절대 throw 안 함)
- 마이그레이션은 user 레이어에만 적용하고, 되쓰는 대상도 그 레이어다
- 레이어를 마지막 인자로 받아 호출자가 넘길 수 있게 둔다 — 테스트가 저장소에 쓰지 않으려면 필요하다

### Ask first

- config 스키마(`types/config`) 변경
- 레이어 개수나 우선순위 변경

### Never do

- 병합 결과를 어느 한 레이어에 되쓰기. project 재정의가 user 기준선에 구워진다
- 비원자적 쓰기 (직접 `writeFile`)
- 마이그레이션 스텝에서 live default 참조 (스텝은 리터럴로 동결)

## Dependencies

- `@ogham/cross-platform`
- `../../types/config` (`Config`, `ConfigSchema`), `../../constants`, `../../lib`
