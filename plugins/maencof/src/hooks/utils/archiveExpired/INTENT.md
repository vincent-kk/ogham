# archiveExpired

## Purpose

MCP bootSweep이 L4 만료 정본을 서고로 옮기고 원위치의 스텁을 보장한다. legacy archive도 읽기 전용으로 백필해 inbound 링크의 고아화를 막는다. 의미적 증류(L2 수확)는 archive-harvest 스킬이 별도 소유한다.

## Conventions

- 훅 도달 그래프의 격리를 위해 Node builtin·tree-shake 가능한 cross-platform·순수 documentParser 링크 파서만 사용한다. zod·fast-glob은 도입하지 않는다.
- 내부 연산과 헬퍼는 concrete 파일로 직접 가져온다.
- 대상은 L4 계열이며 쓰기 목적지는 단일 서고다. 정본 파서 재사용은 코드 예시 링크가 그래프에 다시 들어오는 것을 막는다.

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
