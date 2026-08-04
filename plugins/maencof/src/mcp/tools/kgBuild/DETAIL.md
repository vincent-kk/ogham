# kgBuild — Contract

## Requirements

- `kg_build` 는 지식 그래프 인덱스를 (재)구축한다. 기본은 스냅샷 대비 증분 빌드이고, `force: true` 또는 유효한 선행 스냅샷 부재 시 전체 빌드로 진행한다.
- 빌드 성공 시 그래프·스냅샷을 `MetadataStore` 에 저장하고 stale 엔트리를 비운다.
- 개별 파일의 frontmatter 파싱/검증 실패는 non-fatal 이다 — 빌드는 계속되고 실패 목록이 응답에 실린다. 응답의 `parseFailures` 는 `MAX_KG_BUILD_PARSE_FAILURES`(constants/thresholds) 상한으로 절단되며(`operations/capParseFailures`), 절단이 일어났을 때만 `parseFailuresTotal` 이 절단 전 총수를 보고한다 — 광범위 손상 시 파일당 한 항목이 무상한으로 쏟아지는 것을 막는 응답 보호다.
- 빌드 실패는 예외가 아니라 `success: false` + `message` 결과다.

## API Contracts

- `handleKgBuild(vaultPath: string, input: KgBuildInput): Promise<KgBuildResult>`
- `KgBuildInput` — `{ force?: boolean }`(기본 false = 증분).
- `KgBuildResult` — `MaencofCrudResult & { nodeCount, edgeCount, durationMs, incremental, parseFailures?, parseFailuresTotal? }`. `KgBuildParseFailure` 는 `{ path, errors[] }`. 정본은 `types/types.ts`.
- `capParseFailures(failures)` — 상한 이내면 원본 그대로(`parseFailuresTotal` 없음), 초과면 앞쪽 상한 개수 + 총수.

## Acceptance Criteria

### AC-parse-failure-cap — 파싱 실패 목록 상한

- 실패가 `MAX_KG_BUILD_PARSE_FAILURES` 를 넘으면 응답 목록 길이가 상한과 같고 `parseFailuresTotal` 이 절단 전 총수를 보고하며, 이내면 전체 목록에 `parseFailuresTotal` 이 실리지 않는다.

### AC-nonfatal-parse-failures — 실패의 비치명성

- 일부 파일이 파싱에 실패해도 빌드 결과는 `success: true` 로 남고 실패 목록이 함께 보고된다.

## Last Updated

2026-08-05 — parseFailures 상한(`capParseFailures`)과 `parseFailuresTotal` 응답 계약을 문서화했다 (cross-review FIX-001/FIX-010).
