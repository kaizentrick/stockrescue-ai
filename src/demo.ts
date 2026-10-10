import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createApp } from "./server.ts";
import { Service } from "./service.ts";
import { Store } from "./store.ts";

// A separate, credential-free process. Never constructs Reap, Meta or Gemini clients.
const port = 4322;
const store = new Store();
let app: ReturnType<typeof createApp> | undefined;
let tail = "";
const start = (origin?: string) => {
  app = createApp(new Service(store), origin, { publicDemo: true });
  app.listen(port, "127.0.0.1", () => {
    console.log("Demo abierta · " + (origin ?? `http://127.0.0.1:${port}`));
    if (origin) {
      mkdirSync(".data", { recursive: true, mode: 0o700 });
      writeFileSync(".data/demo-public-url", origin + "\n", { mode: 0o600 });
    }
  });
  app.on("error", () => {
    console.error(
      "No fue posible abrir el puerto 4322. Revisa si ya corre otra demo.",
    );
    finish(1);
  });
};
const tunnel = process.argv.includes("--tunnel")
  ? spawn(
      "cloudflared",
      ["tunnel", "--url", `http://127.0.0.1:${port}`, "--no-autoupdate"],
      { stdio: ["ignore", "ignore", "pipe"] },
    )
  : undefined;
const stop = (code = 0) => {
  process.exitCode = code;
  tunnel?.kill("SIGTERM");
  if (app)
    app.close(() => {
      store.close();
    });
  else store.close();
};
let stopping = false;
const finish = (code = 0) => {
  if (!stopping) {
    stopping = true;
    stop(code);
  }
};
if (tunnel) {
  tunnel.stderr?.on("data", (chunk) => {
    tail = (tail + String(chunk)).slice(-12000);
    const match = tail.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match && !app) start(match[0]);
  });
  tunnel.on("error", () => {
    console.error("Instala cloudflared y comprueba que esté en PATH.");
    finish(1);
  });
  tunnel.on("exit", () => finish(1));
} else start();
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => finish());
