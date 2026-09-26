// Print the backend's actual runtime port for the Vite dev proxy.
// The backend writes .dashboard-runtime.json after it binds (auto-stepping past
// any in-use port). Falls back to 5174 when the file is absent (backend not
// started yet) so the proxy still has a sane default.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve(process.cwd(), '.dashboard-runtime.json');
let port = 5174;
try {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  if (Number.isInteger(data.port)) port = data.port;
} catch {
  // No runtime file yet — keep the default.
}
process.stdout.write(String(port));
