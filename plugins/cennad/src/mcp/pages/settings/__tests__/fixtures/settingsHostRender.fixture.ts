// Executed by settingsHostPaths.test.ts in a fresh process; env selects the real host resolver.
import { startSettingsServer } from '../../../../tools/openSettings/webServer/index.js';

const handle = await startSettingsServer({
  settingsHtml:
    "<script>window.__CENNAD_STATE__='__CENNAD_STATE__';</script>",
  idleMs: 60_000,
});

try {
  const response = await fetch(handle.url);
  if (!response.ok) throw new Error(`GET / returned ${response.status}`);
  const html = await response.text();
  const match = html.match(
    /window\.__CENNAD_STATE__\s*=\s*(\{.*?\});\s*<\/script>/s,
  );
  if (!match) throw new Error('settings page did not contain inline state');
  const state = JSON.parse(match[1]) as { activeHome?: unknown };
  process.stdout.write(JSON.stringify({ activeHome: state.activeHome }));
} finally {
  await handle.close();
}
