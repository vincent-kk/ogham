# archiveExpired

## Purpose

SessionEnd 관심사. L4 `04_Action/` 문서 중 `expires < today` 인 만료본을 `.maencof-meta/archive/` 로 이동하고, 원위치에 경량 스텁(frontmatter + 요약 + [[링크]])을 남겨 그래프 연결을 유지한다(고아 방지). 기계적 아카이빙만 담당하며, 메타지식의 의미적 증류(L2 수확)는 `/archive-harvest` 스킬이 별도로 수행한다.

## Structure

- `archiveExpired.ts` — `runArchiveExpired` 오케스트레이터 (스캔 → 이동 → 스텁, 롤백)
- `utils/` — frontmatter 파싱·스텁 생성·경로/YAML 헬퍼 (organ, 함수 1개/파일)

## Conventions

- 훅 번들 격리: Node builtin(`node:fs/promises`·`node:path`)만 사용. zod(documentParser)·fast-glob(vaultScanner) 미의존 — 검증이 아니라 expires 비교 + 스텁 생성만 필요하므로 경량 자체 구현.
- `utils/` concrete 파일 직접 import (배럴 없음)

## Boundaries

### Always do

- 이동(rename) 후 스텁 write 실패 시 원본 롤백
- 개별 문서 실패는 skip — 세션 종료를 막지 않음
- `archived: true` 스텁은 재처리하지 않음 (멱등)

### Ask first

- 스텁 포맷 / frontmatter 필드 변경

### Never do

- archive 정본 삭제 / 덮어쓰기
- zod·fast-glob 등 무거운 런타임 의존 도입 (훅 번들 비대)
