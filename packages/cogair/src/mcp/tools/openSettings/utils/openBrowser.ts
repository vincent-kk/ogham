import { spawn } from 'node:child_process';

/**
 * Best-effort attempt to open `url` in the user's default browser.
 * Silently no-ops on failure (headless / CI / SSH) so the caller can still
 * surface the URL via stdout.
 */
export function openBrowser(url: string): void {
  if (process.env.COGAIR_DISABLE_BROWSER) return;
  const cmd =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'start'
        : 'xdg-open';
  try {
    const child = spawn(cmd, [url], {
      stdio: 'ignore',
      detached: true,
      shell: process.platform === 'win32',
    });
    child.on('error', () => {});
    child.unref();
  } catch {
    // Headless / unsupported platform — caller falls back to stdout.
  }
}
