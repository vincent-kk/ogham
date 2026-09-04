import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { renderPrComment } from '../../mcp/tools/reviewState/render/renderPrComment.js';
import { renderReviewReport } from '../../mcp/tools/reviewState/render/renderReviewReport.js';
import { buildReviewRenderInput } from '../unit/mcp/reviewState/helpers/buildReviewRenderInput.js';

/** Canonical skill assets shipped independently of implementation documents. */
const skillsRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../skills',
);

describe('cross-review standalone output contract', () => {
  it('does not index implementation INTENT or DETAIL from skill instructions', () => {
    const references = readdirSync(skillsRoot, {
      recursive: true,
      encoding: 'utf8',
    })
      .filter((path) => path.endsWith('.md'))
      .flatMap((path) => {
        const prose = readFileSync(join(skillsRoot, path), 'utf8').replace(
          /```[\s\S]*?```/gu,
          '',
        );
        const references = prose.match(
          /(?:src\/|(?:\.\.\/)+|plugins\/filid\/)[^`\s)]*(?:INTENT|DETAIL)\.md/gu,
        );
        return references?.map((reference) => ({ path, reference })) ?? [];
      });

    expect(references).toEqual([]);
  });

  it('keeps the report skeleton and metadata in the shipped skill', () => {
    const contract = readFileSync(
      join(skillsRoot, 'cross-review/report-formats.md'),
      'utf8',
    );
    const rendered = renderReviewReport(buildReviewRenderInput());
    const skeleton = contract.match(/```markdown\n([\s\S]*?)\n```/u)?.[1] ?? '';

    expect(skeleton.match(/^## .+$/gmu)).toEqual(rendered.match(/^## .+$/gmu));
    const keys = rendered
      .split('---')[1]
      .trim()
      .split('\n')
      .map((line) => line.split(':')[0]);
    for (const key of keys) expect(skeleton).toContain(`${key}:`);
  });

  it('documents the actual PR table and disclosure blocks without another module', () => {
    const contract = readFileSync(
      join(skillsRoot, 'cross-review/report-formats.md'),
      'utf8',
    );
    const rendered = renderPrComment(buildReviewRenderInput());
    const publication = contract.split('## PR comment')[1] ?? '';
    const summaryLabels = [
      ...rendered.split('<details>')[0].matchAll(/^\| ([^|]+) \|/gmu),
    ]
      .map(([, label]) => label.trim())
      .filter((label) => !/^[-:]+$/u.test(label));
    const documentedLabels = [...publication.matchAll(/^\| ([^|]+) \|/gmu)].map(
      ([, label]) => label.trim(),
    );

    expect(documentedLabels).toEqual(expect.arrayContaining(summaryLabels));
    expect(publication.match(/<details>/gu)).toHaveLength(3);
    expect(publication).toContain('Coverage and verification log');
    expect(publication).toContain('Unresolved evidence');
    expect(publication).toContain('> Full report:');
  });
});
