import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

// Spawn a long-lived grandchild that inherits this process's group, record its
// pid, then keep this (parent) process alive so spawnCli must kill it. With a
// detached group-kill, killing the parent's group reaps the grandchild too.
const pidFile = process.argv[2];
const grandchild = spawn(
  process.execPath,
  ["-e", "setTimeout(() => {}, 60000)"],
  {
    stdio: "ignore",
  },
);
writeFileSync(pidFile, String(grandchild.pid));
setTimeout(() => {}, 60000);
