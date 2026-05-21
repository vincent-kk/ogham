import type { ConversationError, ConversationOptions } from './conversation.js';

export interface DispatchOptions {
  prompt: string;
  model: 'high' | 'mid' | 'low' | 'auto';
  options: ConversationOptions;
  sessionId: string;
  cwd: string;
}

export interface DispatchResumeOptions extends DispatchOptions {
  externalSessionRef: string;
}

export interface DispatchResult {
  status: 'success' | 'failure';
  response: string | null;
  error: ConversationError | null;
  externalSessionRef: string;
  ignoredOptions: string[];
  resolvedModel: string | null;
}

export interface Dispatcher {
  readonly supportedOptions: ReadonlySet<keyof ConversationOptions>;
  start(args: DispatchOptions): Promise<DispatchResult>;
  resume(args: DispatchResumeOptions): Promise<DispatchResult>;
}
