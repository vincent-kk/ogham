# core — Contract

## Requirements

- `.imbas/` 아래의 상태·설정·매니페스트를 소유하는 비즈니스 로직 계층이다. MCP 도구 핸들러는 이 계층에 위임만 하고 스스로 판단하지 않는다.
- 파일 쓰기는 `lib/fileIo.ts` 의 atomic write 를 경유한다. `fs.writeFileSync` 직접 호출은 원자성을 잃어 중단된 실행이 반쯤 쓰인 `state.json` 을 남긴다.
- provider API(Jira·GitHub) 호출은 이 계층의 몫이 아니다. core 는 파일과 스키마만 다루고, 트래커 실행은 스킬 계층이 수행한다.
- Zod 스키마는 `types/` 가 단독 소유한다. core 는 스키마를 정의하지 않고 참조만 한다.

## API Contracts

`index.ts` 배럴이 노출하는 공개 심볼은 다음과 같다.

| 심볼                                                                            | 출처                 |
| ------------------------------------------------------------------------------- | -------------------- |
| `createRunState` · `loadRunState` · `saveRunState` · `applyTransition`          | `stateManager/`      |
| `loadConfig` · `saveConfig` · `updateConfigLayer` · `getConfigValue`            | `configManager/`     |
| `loadManifest` · `getManifestSummary` · `getEstimationSummary` · `ManifestType` | `manifestParser/`    |
| `validateManifest`                                                              | `manifestValidator/` |
| `getImbasRoot` · `getProjectDir` · `getCacheDir` · `getRunsDir` · `getRunDir`   | `paths/`             |
| `generateRunId`                                                                 | `runIdGenerator/`    |

- 배럴은 이름을 하나씩 적는다. 와일드카드 재노출은 하위 fractal 의 내부 심볼을 조용히 공개 계약으로 승격시킨다.
- `configManager` 의 계층 전용 심볼(`loadConfigByScope` · `loadConfigScope` · `ConfigByScope`)은 이 배럴에 없다. 계층을 다루는 소비자는 `core/configManager` 진입점을 직접 지목한다.
- `utils/` 는 organ 이다 — `advancePhase` · `handleCompletePhase` · `validateStartPhase` 는 `stateManager` 전용이며 배럴로 나가지 않는다.

## Acceptance Criteria

### AC-core-barrel-named — 배럴 명시 재노출

- `core/index.ts` 에 `export *` 형태가 없다.
- 배럴이 노출하는 심볼이 위 표와 정확히 일치한다.

### AC-core-atomic-write — 원자적 파일 쓰기

- `core/**` 에 `fs.writeFileSync` · `fs.promises.writeFile` 직접 호출이 없다.

### AC-core-no-tracker-io — 트래커 I/O 부재

- `core/**` 가 네트워크 클라이언트나 `gh` · `jira` CLI 를 호출하지 않는다.

### AC-core-utils-internal — utils organ 비공개

- `core/utils/` 의 심볼이 `core/index.ts` 를 통해 노출되지 않는다.
- `core/utils/` 를 `core/` 바깥에서 직접 import 하는 파일이 없다.

## Last Updated

2026-08-06 — v2 재편으로 `cacheManager` · `executionPlanner` · `implementPlanner` 가 제거된 뒤의 core 공개 표면을 계약화했다.
