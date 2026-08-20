# archiveExpired

## Requirements

- 입력: `currentWorkingDirectory` (vault 루트 절대 경로).
- 출력: `{ continue: true, archived: string[], backfilled: string[] }` — `archived` 는 이번에 아카이빙된 문서, `backfilled` 는 스텁이 소급 복구된 문서 (둘 다 vault 상대 경로 `04_Action/...`).
- 불변식: 서고 `99_Archive/actions/<path>` 또는 legacy `.maencof-meta/archive/04_Action/<path>` 에 정본이 있으면 원위치 `04_Action/<path>` 에 스텁(또는 live 문서)이 반드시 존재한다. 매 MCP 부팅(bootSweep)에 정방향·역방향으로 집행한다.
- 정방향(archiveExpiredForward): `04_Action/` 하위 `.md` 중 `archived !== true` 이고 `expires < today` 인 문서를 `99_Archive/actions/<path>` 로 이동(rename)하고 원위치에 스텁을 남긴다. 스텁 write 실패 시 원본 복구.
- 역방향(backfillMissingStubs): 신규 루트 `99_Archive/actions/**/*.md` 를 먼저, legacy 루트 `.maencof-meta/archive/04_Action/**/*.md` 를 이어서 순회하여 원위치 `04_Action/<path>` 가 없으면 스텁을 소급 생성한다. 스텁의 `archive_path` 는 정본이 실제로 있는 루트를 기록한다(legacy 정본은 legacy 경로). 같은 상대 경로가 양 루트에 있으면 신규 루트가 이긴다(첫 스텁 생성 후 멱등 skip). 스텁 기능 도입(2026-07) 이전 아카이빙분과 마이그레이션 전 vault 의 dangling inbound `[[04_Action/...]]` 링크를 복원한다.
- 스텁: 원본 frontmatter(created/tags/title) 보존 + `archived: true` + `archive_path` + 첫 문단 요약 + [[wikiLink]] 목록. 위키링크 추출은 정본 파서 `core/documentParser/operations/extractLinks` 를 재사용 — `kg_build` 가 실제 edge 로 만드는 링크만 보존하고, 코드 스팬/펜스드 블록 안의 예시 위키링크는 제외한다.
- 견고성: `isMaencofVault` 아니거나 해당 디렉터리 부재 시 no-op. 개별 문서 실패는 skip. 항상 `continue: true`.
- 멱등: 정방향은 `archived: true` 스텁을 건너뛰고, 역방향은 원위치가 이미 존재하면 건너뛴다(덮어쓰기 없음).
- 범위: 두 루트 모두 `04_Action` 계열 경로만 순회한다. `99_Archive` 의 다른 서고 시리즈(`cve/` 등)는 대상 아님.

## API Contracts

- export: `runArchiveExpired(cwd: string): Promise<ArchiveExpiredResult>` — 정방향 후 역방향 백필을 순차 실행해 결과를 병합.
- operations: `archiveExpiredForward(cwd, today): Promise<string[]>` (archived), `backfillMissingStubs(cwd, today): Promise<string[]>` (backfilled).
- 독립 bridge 없음 — MCP `bootSweep` 이 vaultCommitter 앞에서 호출(이동·스텁·백필 결과를 그 커밋에 포함).
- 의존: `isMaencofVault` (게이트), `operations/` (정방향·역방향 I/O), `utils/` (파싱·스텁 빌드), `core/documentParser/operations/extractLinks` (위키링크 파싱 정본 — concrete import), `@ogham/cross-platform` (`normalize` — vault 상대 경로 separator 정규화). 그 외 Node builtin 뿐.

## History

- 2026-08-20 — 정본 목적지를 `.maencof-meta/archive/04_Action/` 에서 `99_Archive/actions/` 로 통합. publication 서고(99_Archive) 신설로 "그래프 밖 정본은 서고에, 메타데이터는 `.maencof-meta` 에" 원칙이 확정되어 아카이브 정본도 서고로 수렴. legacy 루트는 backfill 읽기 전용 폴백으로 유지 — 마이그레이션 전 vault 의 불변식을 보장한다.
