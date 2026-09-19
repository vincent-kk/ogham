import { describe, expect, it } from 'vitest';

import {
  TOOL_ERROR_DIAGNOSTIC_CODE,
  TOOL_ERROR_NEXT_ACTION,
  TOOL_INPUT_DIAGNOSTIC_CODE,
  TOOL_INPUT_NEXT_ACTION,
} from '../../../constants/toolEnvelope.js';
import { ToolDiagnosticError } from '../../../mcp/errors/toolDiagnosticError.js';
import { toolError } from '../../../mcp/server/envelope/toolError.js';

function diagnosticOf(result: ReturnType<typeof toolError>) {
  return JSON.parse(result.content[0].text).diagnostics[0];
}

describe('toolError next action', () => {
  it("carries a typed error's own code, message and next action", () => {
    expect(
      diagnosticOf(
        toolError(
          new ToolDiagnosticError(
            'review-branch-unresolved',
            'HEAD is detached.',
            'Pass branchName explicitly, then call again.',
          ),
        ),
      ),
    ).toStrictEqual({
      code: 'review-branch-unresolved',
      message: 'HEAD is detached.',
      nextAction: 'Pass branchName explicitly, then call again.',
    });
  });

  it('tells the caller to fix its arguments after an input error', () => {
    expect(
      diagnosticOf(
        toolError(new Error('path: Required'), TOOL_INPUT_DIAGNOSTIC_CODE),
      ),
    ).toStrictEqual({
      code: TOOL_INPUT_DIAGNOSTIC_CODE,
      message: 'path: Required',
      nextAction: TOOL_INPUT_NEXT_ACTION,
    });
  });

  it('gives an unclassified failure the generic next action', () => {
    expect(diagnosticOf(toolError(new TypeError('boom')))).toStrictEqual({
      code: TOOL_ERROR_DIAGNOSTIC_CODE,
      message: 'boom',
      nextAction: TOOL_ERROR_NEXT_ACTION,
    });
  });
});
