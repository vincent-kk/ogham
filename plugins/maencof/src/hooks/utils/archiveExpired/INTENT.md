# archiveExpired

## Purpose

MCP bootSweep 관심사. L4 `04_Action/` 의 아카이브 불변식을 매 부팅(직전 세션 마무리) 집행한다 — `expires < today` 만료본은 `.maencof-meta/archive/` 로 옮기고(정방향), archive 에만 있고 원위치에 없는 문서는 경량 스텁(frontmatter + 요약 + [[링크]])을 소급 복구한다(역방향). 어느 쪽이든 원위치에 스텁을 남겨 그래프 연결을 유지한다(고아 방지). 의미적 증류(L2 수확)는 `/archive-harvest` 스킬이 별도 수행.

## Structure

- `archiveExpired.ts` — `runArchiveExpired` 오케스트레이터 (정방향 → 역방향 백필 → 결과 병합)
- `operations/` — `archiveExpiredForward`(만료 이동+스텁, 롤백)·`backfillMissingStubs`(누락 스텁 소급 복구) (organ)
- `utils/` — frontmatter 파싱·스텁 생성·경로/YAML 헬퍼 (organ, 함수 1개/파일)

## Conventions

- 훅 번들 격리: Node builtin(`node:fs/promises`·`node:path`)과 tree-shake 가능한 `@ogham/cross-platform/paths`(`normalize`)만 사용. zod·fast-glob 미의존 — 경량 자체 구현.
- `operations/`·`utils/` concrete 파일 직접 import (배럴 없음)
- 대상은 `04_Action` 구조만 — archive 하위 `digested/`·`harvested/`·`legacy-l3-cve/` 제외

## Boundaries

### Always do

- 정방향: 이동(rename) 후 스텁 write 실패 시 원본 롤백
- 역방향: 원위치가 이미 존재하면 skip (덮어쓰기 금지, 멱등)
- 개별 문서 실패는 skip — 세션 종료를 막지 않음

### Ask first

- 스텁 포맷 / frontmatter 필드 변경

### Never do

- archive 정본 삭제 / 덮어쓰기
- zod·fast-glob 등 무거운 런타임 의존 도입 (훅 번들 비대)
