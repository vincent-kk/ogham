import type { DebtItem } from '../../../../types/debt.js';

export function buildMarkdownBody(item: DebtItem): string {
  return `# 기술 부채: ${item.title}
## 원래 수정 요청
${item.original_request}
## 개발자 소명
${item.developer_justification}
## 정제된 ADR
${item.refined_adr}`;
}
