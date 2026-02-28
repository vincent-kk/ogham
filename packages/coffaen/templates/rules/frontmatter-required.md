---
rule_id: frontmatter-required
rule_name: Frontmatter 필수 필드 규칙
severity: error
category: documentation
auto_fix: partial
version: 1.0.0
---

# Frontmatter 필수 필드 규칙

## 목적

모든 coffaen 마크다운 문서가 유효한 Frontmatter를 포함하도록 강제한다.
FrontmatterSchema(Zod) 기반 검증을 적용한다.

## 필수 필드

| 필드 | 타입 | 형식 | 자동 수정 |
|------|------|------|---------|
| `created` | string | YYYY-MM-DD | 가능 (mtime 기반) |
| `updated` | string | YYYY-MM-DD | 가능 (현재 날짜) |
| `tags` | string[] | 최소 1개 | 가능 (파일명 기반) |
| `layer` | number | 1-4 | 가능 (경로 기반) |

## 선택 필드 (Layer별)

| 필드 | Layer | 설명 |
|------|-------|------|
| `title` | 전체 | 문서 제목 |
| `source` | 3 | 외부 출처 URL |
| `expires` | 4 | 만료일 YYYY-MM-DD |
| `confidence` | 2,3 | 내재화 신뢰도 0.0~1.0 |
| `accessed_count` | 전체 | 세션별 참조 횟수 |

## 규칙 정의

### R1. Frontmatter 존재 필수

모든 `.md` 파일(인덱스 파일 제외)은 YAML frontmatter(`---`)를 포함해야 한다.

### R2. 날짜 형식 준수

`created`, `updated`, `expires` 필드는 `YYYY-MM-DD` 형식이어야 한다.

```yaml
# 올바른 예
created: 2026-02-28

# 위반 예
created: 28/02/2026  # ERROR
created: "2026-2-8"  # ERROR
```

### R3. tags 최소 1개

`tags` 배열은 비어 있을 수 없다.

### R4. created 불변

`created` 필드는 최초 생성 후 변경하지 않는다.
MCP 도구가 `updated` 필드만 자동 갱신한다.

### R5. Layer 4 만료일 권장

`04_Action/` 파일은 `expires` 필드를 갖는 것을 권장한다 (warning).

## 검증 로직

```typescript
import { FrontmatterSchema } from '../types/frontmatter.js';

function validateFrontmatter(raw: string, path: string): DiagnosticItem[] {
  const result = FrontmatterSchema.safeParse(parsedYaml(raw));
  if (!result.success) {
    return result.error.issues.map(issue => ({
      category: 'invalid-frontmatter',
      severity: 'error',
      path,
      message: `${issue.path.join('.')}: ${issue.message}`,
      autoFix: getAutoFix(issue, path)
    }));
  }
  return [];
}
```

## 자동 수정

| 위반 | 자동 수정 방법 |
|------|-------------|
| `created` 누락 | 파일 mtime에서 YYYY-MM-DD 추출 |
| `updated` 누락 | 현재 날짜로 설정 |
| `tags` 누락 | 파일명(확장자 제거)을 태그로 사용 |
| `layer` 누락 | 경로에서 Layer 번호 추출 |
| 날짜 형식 오류 | 자동 수정 불가 (수동 수정 필요) |

## 예외

- `.coffaen/`, `.coffaen-meta/` 내부 파일 제외
- `README.md` 제외
- Frontmatter가 없는 파일은 R1 위반으로 보고
