export class AsyncAgentLifecycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AsyncAgentLifecycleError";
  }
}
