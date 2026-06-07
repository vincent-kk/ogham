# providers/github — DETAIL

## Requirements

`parseLinks(body: string): GithubLinks` 함수는 GitHub 이슈 바디에서 `## Links` 섹션을 파싱하여
링크 타입별 이슈 참조 배열을 반환한다.

- `## Links` 섹션이 없으면 `{}` 반환
- 섹션이 있지만 항목이 없으면 `{}` 반환
- 각 줄 형식: `- <linkType>: <refList>` (공백 허용)
- `linkType` ∈ `{blocks, blocked-by, split-from, split-into, relates}`
- `refList`: 쉼표로 구분된 `#N` 또는 `owner/repo#N` 목록
- 중복 `linkType` 키: refs 합집합으로 병합
- 알 수 없는 `linkType`: `console.warn` 후 skip

## API Contracts

```typescript
export type GithubLinks = Partial<Record<
  'blocks' | 'blocked-by' | 'split-from' | 'split-into' | 'relates',
  string[]
>>;

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

| Input | Output |
|---|---|
| No `## Links` section | `{}` |
| Empty `## Links` section | `{}` |
| Duplicate `linkType` | merged array (union) |
| Unknown `linkType` | warn + skip |
| Extra whitespace | trimmed |

## Last Updated

2026-04-06
