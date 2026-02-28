---
rule_id: layer-structure
rule_name: Layer 구조 규칙
severity: error
category: structure
auto_fix: partial
version: 1.0.0
---

# Layer 구조 규칙

## 목적

coffaen 4-Layer 지식 모델의 디렉토리 구조 준수를 강제한다.
파일 경로와 Frontmatter `layer` 필드의 일치를 보장한다.

## 규칙 정의

### R1. 디렉토리-Layer 매핑

| 디렉토리 접두사 | Layer | 설명 |
|--------------|-------|------|
| `01_Core/` | 1 | Core Identity Hub |
| `02_Derived/` | 2 | 내재화 지식 |
| `03_External/` | 3 | 외부 참조 |
| `04_Action/` | 4 | 작업 기억 |

### R2. Frontmatter layer 필드 일치

파일 경로의 Layer와 Frontmatter `layer` 필드가 반드시 일치해야 한다.

```yaml
# 올바른 예 (02_Derived/skills/programming.md)
layer: 2

# 위반 예 (02_Derived/skills/programming.md)
layer: 3  # ERROR: 경로는 Layer 2인데 Frontmatter는 Layer 3
```

### R3. Layer 1 아웃바운드 링크 금지

`01_Core/` 문서는 다른 문서로의 아웃바운드 링크를 가질 수 없다.
Hub 노드는 참조되기만 한다.

```markdown
<!-- 위반: 01_Core/values.md 내부 -->
[관련 스킬](../02_Derived/skills/programming.md)  <!-- ERROR -->
```

### R4. 상위 Layer → Layer 4 링크 금지

Layer 1/2/3 문서는 Layer 4 (`04_Action/`) 문서를 참조할 수 없다.
휘발성 작업 기억은 영속 지식에서 참조되지 않는다.

## 검증 로직

```typescript
function validateLayerStructure(node: KnowledgeNode): DiagnosticItem[] {
  const issues: DiagnosticItem[] = [];
  const pathLayer = inferLayerFromPath(node.path);

  // R2: Frontmatter layer 일치 검사
  if (pathLayer !== node.layer) {
    issues.push({
      category: 'layer-mismatch',
      severity: 'error',
      path: node.path,
      message: `경로 기준 Layer ${pathLayer}, Frontmatter layer: ${node.layer}`,
      autoFix: { fixable: true, description: 'Frontmatter layer를 경로 기준으로 수정' }
    });
  }

  return issues;
}
```

## 자동 수정

- **R2 위반**: Frontmatter `layer` 필드를 경로 기준 값으로 자동 수정 (`coffaen_update`)
- **R1/R3/R4 위반**: 자동 수정 불가, 수동 링크 제거 필요

## 예외

- `.coffaen/`, `.coffaen-meta/` 내부 파일은 이 규칙에서 제외
- `README.md`, `index.md` 파일은 Layer 강제 없음
