/**
 * The two hook contracts this module bridges: Claude's snake_case payload (what a
 * bundled ogham hook handler reads and writes) and agy's camelCase / protojson
 * lifecycle payload. Only the fields ogham actually touches are modelled.
 */

/** Claude hook events ogham maps onto agy. SubagentStart has no agy analogue (dropped). */
export type ClaudeHookEvent =
  | "SessionStart"
  | "UserPromptSubmit"
  | "PreToolUse"
  | "PostToolUse";

/** agy lifecycle events. SessionStart/UserPromptSubmit both ride PreInvocation. */
export type AgyHookEvent =
  | "PreInvocation"
  | "PostInvocation"
  | "PreToolUse"
  | "PostToolUse"
  | "Stop";

/** Fields agy sends on every hook payload (protojson camelCase). */
export interface AgyCommonInput {
  conversationId?: string;
  workspacePaths?: string[];
  transcriptPath?: string;
  artifactDirectoryPath?: string;
  modelName?: string;
}

/** The Claude snake_case input a bundled handler reads from stdin. */
export interface ClaudeHookInput {
  cwd: string;
  session_id: string;
  hook_event_name: ClaudeHookEvent;
  [key: string]: unknown;
}

/** The Claude output a bundled handler writes to stdout (subset consumed here). */
export interface ClaudeHookOutput {
  continue?: boolean;
  hookSpecificOutput?: {
    hookEventName?: string;
    additionalContext?: string;
    permissionDecision?: "allow" | "deny" | "ask" | "defer";
    permissionDecisionReason?: string;
  };
}

/** A step agy injects around an invocation. */
export interface AgyInjectStep {
  ephemeralMessage?: string;
  userMessage?: string;
}

/** The agy response a hook writes to stdout. */
export interface AgyHookResponse {
  injectSteps?: AgyInjectStep[];
  decision?: "allow" | "deny" | "ask" | "force_ask";
  reason?: string;
}
