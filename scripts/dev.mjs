import { spawn } from "node:child_process";
import process from "node:process";
import { createServer } from "vite";

const server = await createServer({
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: false
  }
});

await server.listen();

const info = server.resolvedUrls?.local?.[0] ?? "http://127.0.0.1:5173/";
const electron = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["electron", "."],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: info
    }
  }
);

const shutdown = async (code = 0) => {
  electron.kill();
  await server.close();
  process.exit(code);
};

electron.on("exit", (code) => {
  void shutdown(code ?? 0);
});

process.on("SIGINT", () => {
  void shutdown(0);
});

process.on("SIGTERM", () => {
  void shutdown(0);
});
