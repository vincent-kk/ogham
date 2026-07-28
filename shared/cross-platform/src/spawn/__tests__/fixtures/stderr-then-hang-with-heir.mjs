import { spawn } from "node:child_process";

// A grandchild that inherits this process's stdio keeps the pipes open after a
// SIGKILL lands here, so spawnCli's `close` cannot arrive promptly — that delay is
// the window in which a still-armed idle timer would fire after an abort.
spawn(process.execPath, ["-e", "setTimeout(() => {}, 2000)"], {
  stdio: "inherit",
});
process.stderr.write("Retrying after 30s\n");
setInterval(() => {}, 2000);
