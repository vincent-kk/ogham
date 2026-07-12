# archiveExpired

## Requirements

- 입력: `currentWorkingDirectory` (vault 루트 절대 경로).
- 출력: `{ continue: true, archived: string[], backfilled: string[] }` — `archived` 는 이번에 아카이빙된 문서, `backfilled` 는 스텁이 소급 복구된 문서 (둘 다 vault 상대 경로 `04_Action/...`).
- 불변식: `.maencof-meta/archive/04_Action/<path>` 에 정본이 있으면 원위치 `04_Action/<path>` 에 스텁(또는 live 문서)이 반드시 존재한다. 매 MCP 부팅(bootSweep)에 정방향·역방향으로 집행한다.
- 정방향(archiveExpiredForward): `04_Action/` 하위 `.md` 중 `archived !== true` 이고 `expires < today` 인 문서를 archive 로 이동(rename)하고 원위치에 스텁을 남긴다. 스텁 write 실패 시 원본 복구.
- 역방향(backfillMissingStubs): `.maencof-meta/archive/04_Action/**/*.md` 를 순회하여 원위치 `04_Action/<path>` 가 없으면 스텁을 소급 생성한다. 스텁 기능 도입(2026-07) 이전 아카이빙분의 dangling inbound `[[04_Action/...]]` 링크를 복원한다.
- 스텁: 원본 frontmatter(created/tags/title) 보존 + `archived: true` + `archive_path` + 첫 문단 요약 + [[wikiLink]] 목록. 위키링크 추출은 정본 파서 `core/documentParser/operations/extractLinks` 를 재사용 — `kg_build` 가 실제 edge 로 만드는 링크만 보존하고, 코드 스팬/펜스드 블록 안의 예시 위키링크는 제외한다.
- 견고성: `isMaencofVault` 아니거나 해당 디렉터리 부재 시 no-op. 개별 문서 실패는 skip. 항상 `continue: true`.
- 멱등: 정방향은 `archived: true` 스텁을 건너뛰고, 역방향은 원위치가 이미 존재하면 건너뛴다(덮어쓰기 없음).
- 범위: `04_Action` 구조만. archive 하위 `digested/`·`harvested/`·`legacy-l3-cve/` 는 대상 아님.

## API Contracts

- export: `runArchiveExpired(cwd: string): Promise<ArchiveExpiredResult>` — 정방향 후 역방향 백필을 순차 실행해 결과를 병합.
- operations: `archiveExpiredForward(cwd, today): Promise<string[]>` (archived), `backfillMissingStubs(cwd, today): Promise<string[]>` (backfilled).
- 독립 bridge 없음 — MCP `bootSweep` 이 vaultCommitter 앞에서 호출(이동·스텁·백필 결과를 그 커밋에 포함).
- 의존: `isMaencofVault` (게이트), `operations/` (정방향·역방향 I/O), `utils/` (파싱·스텁 빌드), `core/documentParser/operations/extractLinks` (위키링크 파싱 정본 — concrete import), `@ogham/cross-platform/paths` (`normalize` — vault 상대 경로 separator 정규화). 그 외 Node builtin 뿐.
