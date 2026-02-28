---
rule_id: memory-guard
rule_name: 기억공간 보호 규칙
severity: warning
category: protection
auto_fix: false
version: 1.0.0
---

# 기억공간 보호 규칙

## 목적

coffaen 기억공간의 무결성을 보호한다.
Layer 1 (Core Identity)에 대한 무단 수정을 방지하고, Frontmatter 필수 필드를 검증한다.

## 규칙 정의

### R1. Layer 1 쓰기 경고

`01_Core/` 디렉토리의 문서를 수정하려 할 때 경고를 표시한다.
Core Identity Hub는 사용자의 명시적 의도 없이 변경되어서는 안 된다.

```
# Write/Edit 도구가 01_Core/ 경로를 대상으로 할 때:
⚠️ Layer 1 (Core Identity) 문서를 수정하려 합니다.
   대상: {path}
   이 문서는 핵심 정체성 허브입니다. 정말 수정하시겠습니까?
```

### R2. Frontmatter 필수 필드 검증

모든 기억공간 문서는 다음 Frontmatter 필드를 포함해야 한다:

| 필드 | 필수 | 설명 |
|------|------|------|
| `title` | Yes | 문서 제목 |
| `layer` | Yes | Layer 번호 (1-4) |
| `created` | Yes | 생성 일자 (YYYY-MM-DD) |
| `updated` | Yes | 수정 일자 (YYYY-MM-DD) |
| `tags` | No | 태그 배열 |
| `confidence` | No | 확신도 (0.0-1.0) |
| `schedule` | No | 복습 스케줄 |

```yaml
# 올바른 예
---
title: TypeScript 타입 시스템
layer: 2
created: 2025-01-15
updated: 2025-02-01
tags: [programming, typescript]
confidence: 0.8
---

# 위반 예 (layer 누락)
---
title: TypeScript 타입 시스템
created: 2025-01-15
---
```

### R3. confidence 범위 검증

`confidence` 필드가 존재할 경우 0.0 이상 1.0 이하여야 한다.

### R4. Layer 4 문서 TTL 경고

`04_Action/` 디렉토리의 문서가 30일 이상 미갱신 상태이면 정리 대상으로 경고한다.
작업 기억은 휘발성이므로 주기적 정리가 필요하다.

## 예외

- `.coffaen/`, `.coffaen-meta/` 내부 파일은 이 규칙에서 제외
- `README.md`, `index.md` 파일은 Frontmatter 검증 제외
