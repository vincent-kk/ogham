# archiveExpired

## Requirements

- 입력: `currentWorkingDirectory` (vault 루트 절대 경로).
- 출력: `{ continue: true, archived: string[] }` — `archived` 는 아카이빙된 문서의 vault 상대 경로(`04_Action/...`).
- 판정: `04_Action/` 하위 `.md` 중 `archived !== true` 이고 `expires` 가 존재하며 `expires < today` 인 문서.
- 이동: 원본 → `.maencof-meta/archive/04_Action/<상대경로>` (rename). 스텁 write 실패 시 원본 복구.
- 스텁: 원본 frontmatter(created/tags/title) 보존 + `archived: true` + `archive_path` + 첫 문단 요약 + [[wikiLink]] 목록.
- 견고성: `isMaencofVault` 아니거나 `04_Action/` 부재 시 no-op. 개별 문서 실패는 skip. 항상 `continue: true`.
- 멱등: 재실행 시 `archived: true` 스텁은 건너뜀.

## API Contracts

- export: `runArchiveExpired(cwd: string): Promise<ArchiveExpiredResult>`.
- 독립 bridge 없음 — `orchestrateSessionEnd` 가 vaultCommitter 앞에서 호출(만료 이동/스텁 결과를 그 커밋에 포함).
- 의존: `isMaencofVault` (게이트), `utils/` (파싱·스텁 빌드), `@ogham/cross-platform/paths` (`normalize` — vault 상대 경로 separator 정규화). 그 외 Node builtin 뿐.
