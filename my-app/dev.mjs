import { spawn } from "node:child_process";

const children = [];
const packageManager = process.env.npm_execpath?.toLowerCase().includes("pnpm")
  ? "pnpm"
  : "npm";

const start = (scriptName) => {
  const child = spawn(`${packageManager} run ${scriptName}`, {
    stdio: "inherit",
    cwd: process.cwd(),
    shell: true,
  });

  children.push(child);
  child.on("exit", (code) => {
    if (code && code !== 0) {
      process.exitCode = code;
    }
  });
};

const shutdown = () => {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start("dev:server");
start("dev:client");
