import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { normalizeCodexToolUses } from '@ogham/cross-platform';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { handlePreToolUseBatch } from '../../../hooks/preToolUse/index.js';
import type { PreToolUseInput } from '../../../types/hooks.js';

let tmpDir: string;

/** Build a minimal Filid PreToolUse payload rooted in the test project. */
function makeInput(command: string): PreToolUseInput {
  return {
    cwd: tmpDir,
    session_id: 'move-content-test',
    hook_event_name: 'PreToolUse',
    tool_name: 'apply_patch',
    tool_input: { command },
  };
}

/** Run past Filid's intentional first-visit delivery gate. */
async function runAfterVisitGate(command: string) {
  const normalized = normalizeCodexToolUses(makeInput(command));
  await handlePreToolUseBatch(normalized);
  return handlePreToolUseBatch(normalized);
}

/** Build a valid INTENT document with an exact physical line count. */
function intentWithLineCount(lineCount: number): string {
  const required = [
    '# Feature',
    '## Purpose',
    'Fixture',
    '## Conventions',
    '- Stable',
    '## Boundaries',
    '### Always do',
    '- Verify',
    '### Ask first',
    '- Ask',
    '### Never do',
    '- Bypass',
  ];
  return [
    ...required,
    ...Array.from(
      { length: lineCount - required.length },
      (_, index) => `- filler ${index}`,
    ),
  ].join('\n');
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'filid-move-content-'));
  process.env.CLAUDE_CONFIG_DIR = tmpDir;
  writeFileSync(join(tmpDir, 'package.json'), '{"name":"move-fixture"}');
  writeFileSync(
    join(tmpDir, 'INTENT.md'),
    '# Root\n## Purpose\nFixture\n## Conventions\n- Stable\n## Boundaries\n### Always do\n- Verify\n### Ask first\n- Ask\n### Never do\n- Bypass\n',
  );
});

afterEach(() => {
  delete process.env.CLAUDE_CONFIG_DIR;
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('Codex Move destination projection', () => {
  it('denies a bodyless Move whose full INTENT.md exceeds 50 lines', async () => {
    mkdirSync(join(tmpDir, 'src', 'feature'), { recursive: true });
    writeFileSync(
      join(tmpDir, 'src', 'draft.md'),
      Array.from({ length: 51 }, (_, index) => `line ${index}`).join('\n'),
    );
    const result = await runAfterVisitGate(
      '*** Begin Patch\n*** Update File: src/draft.md\n*** Move to: src/feature/INTENT.md\n*** End Patch',
    );

    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      '50-line limit',
    );
  });

  it('fully validates an exact hunk projection for an INTENT destination', async () => {
    mkdirSync(join(tmpDir, 'src', 'feature'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'draft.md'), intentWithLineCount(50));
    const result = await runAfterVisitGate(
      '*** Begin Patch\n*** Update File: src/draft.md\n*** Move to: src/feature/INTENT.md\n@@\n-Fixture\n+Fixture\n+- overflow\n*** End Patch',
    );

    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      '50-line limit',
    );
  });

  it('checks retained imports at the destination path', async () => {
    mkdirSync(join(tmpDir, 'src', 'deep'), { recursive: true });
    writeFileSync(
      join(tmpDir, 'src', 'draft.ts'),
      'import { foo } from "../../";\nexport const child = foo;\n',
    );
    const result = await runAfterVisitGate(
      `*** Begin Patch\n*** Update File: src/draft.ts\n*** Move to: src/deep/child.ts\n*** End Patch`,
    );
    const context = result.hookSpecificOutput?.additionalContext ?? '';

    expect(context).toContain('src/deep/child.ts');
    expect(context).toContain('import');
  });

  it('allows an ambiguous ordinary projection when the structure check passes', async () => {
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'draft.ts'), 'old\nkeep\nold\n');
    const result = await runAfterVisitGate(
      '*** Begin Patch\n*** Update File: src/draft.ts\n*** Move to: src/final.ts\n@@\n-old\n+new\n*** End Patch',
    );

    expect(result.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });

  it('denies an ambiguous projection for a contract destination', async () => {
    mkdirSync(join(tmpDir, 'src', 'feature'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'draft.md'), 'old\nkeep\nold\n');
    const result = await runAfterVisitGate(
      '*** Begin Patch\n*** Update File: src/draft.md\n*** Move to: src/feature/DETAIL.md\n@@\n-old\n+new\n*** End Patch',
    );

    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      'contract document needs exact content',
    );
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      'Edit the source first',
    );
  });

  it('denies an approximate projection whose added import closes a cycle', async () => {
    mkdirSync(join(tmpDir, 'src', 'deep'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'draft.ts'), 'marker\nkeep\nmarker\n');
    const result = await runAfterVisitGate(
      '*** Begin Patch\n*** Update File: src/draft.ts\n*** Move to: src/deep/final.ts\n@@\n-marker\n+import { root } from "../";\n*** End Patch',
    );

    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      'approximate Move projection',
    );
    expect(result.hookSpecificOutput?.additionalContext).toContain(
      'potential circular dependency',
    );
  });

  it('denies a missing Move source with its path', async () => {
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    const result = await runAfterVisitGate(
      '*** Begin Patch\n*** Update File: src/missing.ts\n*** Move to: src/final.ts\n*** End Patch',
    );

    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      'src/missing.ts',
    );
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      'does not exist',
    );
  });

  it('denies an Edit of a destination created earlier in the patch', async () => {
    mkdirSync(join(tmpDir, 'src', 'feature'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'draft.md'), intentWithLineCount(49));
    const result = await runAfterVisitGate(
      '*** Begin Patch\n*** Update File: src/draft.md\n*** Move to: src/feature/INTENT.md\n*** Update File: src/feature/INTENT.md\n@@\n - filler 36\n+- overflow 1\n+- overflow 2\n*** End Patch',
    );

    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      'separate apply_patch',
    );
  });

  it('denies a Move whose source alias was touched earlier', async () => {
    mkdirSync(join(tmpDir, 'src', 'feature'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'draft.md'), intentWithLineCount(49));
    const result = await runAfterVisitGate(
      '*** Begin Patch\n*** Update File: ./src/draft.md\n@@\n - filler 36\n+- overflow 1\n+- overflow 2\n*** Update File: src/draft.md\n*** Move to: src/feature/INTENT.md\n*** End Patch',
    );

    expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput?.permissionDecisionReason).toContain(
      'separate apply_patch',
    );
  });
});
