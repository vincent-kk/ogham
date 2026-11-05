# archiveExpired

## Requirements

- 서고 정본이 있으면 원위치에 스텁 또는 live 문서를 남겨 inbound 링크가 고아가 되지 않게 한다. MCP bootSweep이 이 불변식을 집행한다.
- 그래프 밖 정본은 서고에, 운영 메타데이터는 메타 디렉터리에 둔다. legacy archive 루트는 읽기 전용 백필 폴백으로 유지해 마이그레이션 전 vault에도 같은 불변식을 보장한다.
- 정방향은 만료 L4 문서를 옮기고 스텁 쓰기 실패 시 원본을 복구한다. 역방향은 원위치가 없을 때만 스텁을 만들며 정본과 기존 원위치를 덮어쓰지 않는다. 두 archive 루트에 같은 상대 경로가 있으면 새 서고를 우선한다.
- 스텁은 정본의 frontmatter·요약·실제 그래프 링크를 보존한다. 위키링크 파싱은 documentParser 정본을 재사용해 코드 예시를 그래프 연결로 되살리지 않는다.
- 두 루트 모두 L4 계열만 대상이며 다른 서고 시리즈는 건드리지 않는다. 비볼트·대상 부재는 no-op, 개별 문서 실패는 skip하여 세션을 막지 않는다.

## API Contracts

독립 브리지가 없고 bootSweep이 vaultCommitter보다 먼저 호출해 이동·스텁·백필 결과를 같은 커밋에 담는다. Node builtin·tree-shake 가능한 cross-platform·순수 링크 파서만 사용해 훅 도달 그래프에 무거운 런타임을 끌어들이지 않는다.

vault 런타임 주소는 원위치 `04_Action/<path>`, 정본 `99_Archive/actions/<path>`, 읽기 전용 legacy 폴백 `.maencof-meta/archive/04_Action/<path>`다. 스텁의 archive_path는 정본이 실제 존재하는 루트를 가리켜야 한다.

## Acceptance Criteria

만료 이동·정본 보존·legacy 백필·실제 위키링크 보존의 결과는 모듈 테스트가 고정한다.

## Last Updated

서고 정본·원위치 스텁 불변식, legacy 백필 범위 또는 이동 실패의 복구 계약이 바뀔 때 갱신한다.
