---
rule_id: link-integrity
rule_name: 링크 무결성 규칙
severity: error
category: structure
auto_fix: false
version: 1.0.0
---

# 링크 무결성 규칙

## 목적

coffaen 지식 그래프의 링크 유효성을 보장한다.
깨진 링크, 잘못된 링크 형식, Layer 방향성 위반을 탐지한다.

## 규칙 정의

### R1. 상대 경로 전용

마크다운 링크는 반드시 상대 경로를 사용해야 한다.
절대 경로와 외부 URL은 `source` Frontmatter 필드로 기록한다.

```markdown
<!-- 올바른 예 -->
[관련 스킬](../02_Derived/skills/programming.md)
[같은 디렉토리](./values-backup.md)

<!-- 위반 예 -->
[절대 경로](/Users/me/vault/01_Core/values.md)  <!-- ERROR -->
```

### R2. 링크 대상 존재

`[텍스트](경로)` 링크의 대상 파일이 반드시 존재해야 한다.
존재하지 않는 파일을 참조하는 링크는 `.coffaen-meta/broken-links.json`에 기록된다.

### R3. Layer 방향성 준수

링크 방향은 Layer 정책을 따른다 (06-link-policy.md 기준):

| 출발 Layer | 허용 대상 | 금지 대상 |
|-----------|---------|---------|
| Layer 1 | 없음 (아웃바운드 링크 금지) | 모든 Layer |
| Layer 2 | Layer 1, Layer 2 | Layer 4 |
| Layer 3 | Layer 1, Layer 2 | Layer 4 |
| Layer 4 | Layer 1, Layer 2, Layer 3 | — |

### R4. 순환 참조 경고

두 문서가 서로를 참조하는 순환(A→B→A)은 DAGConverter가 가중치를 약화(0.1)하지만,
직접 상호 참조는 warning으로 보고한다.

### R5. Backlink 인덱스 일관성

`.coffaen-meta/backlink-index.json`의 항목이 실제 파일 시스템과 일치해야 한다.
불일치는 SessionStart Hook이 탐지하고 기록한다.

## 검증 로직

```typescript
function validateLinkIntegrity(
  node: KnowledgeNode,
  graph: KnowledgeGraph
): DiagnosticItem[] {
  const issues: DiagnosticItem[] = [];

  for (const edge of graph.edges) {
    if (edge.from !== node.id || edge.type !== 'LINK') continue;

    const target = graph.nodes.get(edge.to);

    // R2: 링크 대상 존재 확인
    if (!target) {
      issues.push({
        category: 'broken-link',
        severity: 'error',
        path: node.path,
        message: `깨진 링크: ${edge.to}`,
        autoFix: { fixable: false, description: '수동으로 링크를 수정하거나 제거하세요' }
      });
    }

    // R3: Layer 방향성 확인
    if (target && isLayerViolation(node.layer, target.layer)) {
      issues.push({
        category: 'layer-mismatch',
        severity: 'error',
        path: node.path,
        message: `Layer ${node.layer} → Layer ${target.layer} 링크 위반`,
        autoFix: { fixable: false, description: '링크를 제거하거나 대상 문서의 Layer를 변경하세요' }
      });
    }
  }

  return issues;
}
```

## Backlink 인덱스 갱신 트리거

| 이벤트 | 처리 |
|--------|------|
| `coffaen_create` | 새 아웃바운드 링크를 인덱스에 추가 |
| `coffaen_update` | 변경된 링크 재분석 후 재구축 |
| `coffaen_delete` | 해당 문서가 출처인 항목 제거 |
| `coffaen_move` | 경로 갱신 후 인덱스 재구축 |

## 자동 수정

모든 링크 무결성 위반은 **자동 수정 불가**.
수동 검토 후 처리:
- 깨진 링크: 링크 제거 또는 대상 파일 복원
- Layer 위반: 링크 제거 또는 문서 이동

## 예외

- `http://`, `https://` URL 링크는 R1~R4 적용 제외
- `#앵커` 링크는 R2 적용 제외
- `![이미지](경로)` 이미지 링크는 R3 적용 제외
