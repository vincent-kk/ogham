# companionEdit — Contract

## Requirements

- `.maencof-meta/companion-identity.json` 을 바꾸는 유일한 허가 채널이다. 파일 직접 편집 금지 규칙의 예외는 이 경로 하나뿐이고, `companion_edit` MCP 도구가 여기로 위임한다.
- preview 경로는 파일을 절대 쓰지 않는다. `commit` 이 참이 아닌 모든 호출에서 디스크는 불변이고, 반환되는 `identity_preview` 는 메모리상의 후보다.
- 로드는 항상 `companionNormalize` 를 거친다. 레거시 v1 파일도 같은 편집 연산을 받을 수 있어야 하고, 매핑을 여기서 다시 구현하면 렌더·마이그레이션과 어긋난다.
- 저장 전 검증은 세 겹이다 — 정본 `CompanionIdentitySchema` Zod 파싱, 매 턴 예산 단조-개선 게이트, brief 길이 역전 검사. 앞의 두 개 중 하나라도 error 를 만들면 커밋을 거부한다.
- 매 턴 예산은 절대 기준이 아니라 **단조 기준** 이다. 편집 후 총합이 `TURN_IDENTITY_CHAR_BUDGET` 이내이거나 편집 전 총합을 악화시키지 않으면 통과한다 — 마이그레이션 직후 이미 초과한 상태에서도 brief 를 하나씩 붙여 예산 아래로 수렴할 수 있어야 하기 때문이다. 초과를 더 키우는 편집만 error 가 된다.
- 세션 예산은 soft 다. 초과해도 warning 으로만 남고 커밋을 막지 않는다.
- 마지막 섹션은 지울 수 없다. 섹션이 하나도 없는 동반자는 렌더할 것이 없으므로 `remove_section` 이 마지막 하나를 지우려 하면 거부한다.
- `key` 는 정체성이라 `update_section` 이 바꾸지 못한다. 패치의 `key` 는 병합에서 무시되고 기존 값이 유지된다.
- 커밋은 `backupPath` 규칙으로 백업한 뒤 Zod 가 파싱한 데이터(`parsed.data`)를 쓴다. 입력 그대로가 아니라 스키마를 통과한 값이 파일에 남는다.
- 실패는 예외가 아니라 결과 객체다. 파일 부재·JSON 파싱 실패·필수 필드 누락 모두 `success: false` + `errors` 로 돌려준다.

## API Contracts

- 정본 저장에는 스키마를 통과한 값을 사용한다. key는 섹션의 정체성이므로 패치로 변경하지 않는다.
- 성공한 커밋은 전체 identity를 에코하지 않는다 — 방금 저장한 내용을 다시 싣는 컨텍스트 낭비를 막는다. preview와 검증 거부는 후보를 보여준다.
- 매 턴 예산의 단조 개선과 세션 예산의 soft 경고를 구별한다. 오류·경고와 커밋 여부는 결과로 돌려주어 저작 도구가 다음 행동을 결정한다.

## Acceptance Criteria

### AC-section-key-immutable — 섹션 key 불변

- `update_section` 패치에 `key` 가 있어도 기존 key 가 유지된다.

## Last Updated

정본 편집 권한·preview 불변성·단조 예산 게이트가 바뀔 때 갱신한다.
