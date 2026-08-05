# providers/github — DETAIL

## Requirements

`parseLinks(body: string): GithubLinks` 함수는 GitHub 이슈 바디에서 `## Links` 섹션을 파싱하여 링크 타입별 이슈 참조 배열을 반환한다.

- `## Links` 섹션이 없으면 `{}` 반환
- 섹션이 있지만 항목이 없으면 `{}` 반환
- 각 줄 형식: `- <linkType>: <refList>` (공백 허용)
- `linkType` ∈ `{blocks, blocked-by, split-from, split-into, relates}`
- `refList`: 쉼표로 구분된 `#N` 또는 `owner/repo#N` 목록
- 중복 `linkType` 키: refs 합집합으로 병합
- 알 수 없는 `linkType`: `console.warn` 후 skip

## API Contracts

```typescript
export type GithubLinks = Partial<
  Record<
    'blocks' | 'blocked-by' | 'split-from' | 'split-into' | 'relates',
    string[]
  >
>;

export function parseLinks(body: string): GithubLinks;
```

### Input examples

```markdown
## Links

- blocks: #10, #11
- blocked-by: owner/repo#5
- relates: #99
```

### Output example

```json
{
  "blocks": ["#10", "#11"],
  "blocked-by": ["owner/repo#5"],
  "relates": ["#99"]
}
```

### Edge cases

| Input                    | Output               |
| ------------------------ | -------------------- |
| No `## Links` section    | `{}`                 |
| Empty `## Links` section | `{}`                 |
| Duplicate `linkType`     | merged array (union) |
| Unknown `linkType`       | warn + skip          |
| Extra whitespace         | trimmed              |

## Acceptance Criteria

### AC-github-links-absent — 섹션 부재 처리

- `## Links` 섹션이 없는 바디에 대해 `parseLinks` 가 `{}` 를 반환한다.
- `## Links` 섹션이 있지만 항목이 없으면 `{}` 를 반환한다.

### AC-github-links-parse — 항목 파싱

- `- blocks: #10, #11` 이 `{ blocks: ['#10', '#11'] }` 로 파싱된다.
- `owner/repo#5` 형태의 교차 저장소 참조가 그대로 보존된다.
- 콜론·쉼표 주변의 여분 공백이 제거된다.

### AC-github-links-merge — 중복 키 병합

- 같은 `linkType` 이 여러 줄에 나오면 refs 가 합집합으로 병합된다.

### AC-github-links-forward-compat — 전방 호환

- 알 수 없는 `linkType` 은 `console.warn` 후 건너뛴다.
- 알 수 없는 항목이 있어도 `parseLinks` 가 throw 하지 않고 나머지 항목을 반환한다.

### AC-github-pure — 순수성

- `github/**` 가 `node:fs` · `node:child_process` · 네트워크 클라이언트를 import 하지 않는다.
- 같은 입력에 대해 같은 출력을 반환한다.

## Last Updated

2026-08-06 — 필수 `## Acceptance Criteria` 섹션을 추가해 문서 계약 위반을 해소했다.
