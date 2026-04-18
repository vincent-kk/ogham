import type { HookOutput, PreToolUseInput } from '../../../../types/hooks.js';
import { checkCircularImports } from '../../../utils/check-circular-imports.js';
import { checkIntentMdReclassification } from '../../../utils/check-intent-md-reclassification.js';
import { checkOrganSubdirectory } from '../../../utils/check-organ-subdirectory.js';
import { getParentSegments } from '../../../utils/get-parent-segments.js';
import { validateCwd } from '../../../utils/validate-cwd.js';

export function guardStructure(input: PreToolUseInput): HookOutput {
  if (input.tool_name !== 'Write' && input.tool_name !== 'Edit') {
    return { continue: true };
  }

  const filePath = input.tool_input.file_path ?? input.tool_input.path ?? '';
  if (!filePath) {
    return { continue: true };
  }

  const cwd = validateCwd(input.cwd);
  if (cwd === null) return { continue: true };
  const segments = getParentSegments(filePath);
  const content = input.tool_input.content ?? input.tool_input.new_string ?? '';

  const info = checkIntentMdReclassification(
    input.tool_name,
    filePath,
    cwd,
    segments,
  );
  const warnings = [
    ...checkOrganSubdirectory(segments, cwd),
    ...checkCircularImports(filePath, content, cwd),
  ];

  if (warnings.length === 0 && info.length === 0) {
    return { continue: true };
  }

  const parts: string[] = [];
  if (info.length > 0) {
    parts.push(
      `[filid:info] structure-guard:\n` +
        info.map((m, i) => `${i + 1}. ${m}`).join('\n'),
    );
  }
  if (warnings.length > 0) {
    parts.push(
      `[filid:warn] structure-guard:\n` +
        warnings.map((w, i) => `${i + 1}. ${w}`).join('\n'),
    );
  }

  return {
    continue: true,
    hookSpecificOutput: { additionalContext: parts.join('\n\n') },
  };
}
