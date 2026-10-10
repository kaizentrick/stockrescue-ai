import { configureMetaWebhook } from "./meta-setup.ts";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Secrets are captured from 1Password through pipes and passed only in memory.
const read = (item: string): string => {
  const result = JSON.parse(
    execFileSync("op", ["item", "get", item, "--format=json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 60000,
    }),
  );
  const value = result.fields.find(
    (f: { id: string; value?: string }) => f.id === "credential",
  )?.value;
  if (typeof value !== "string" || !value)
    throw new Error("Secret unavailable");
  return value;
};
let env: NodeJS.ProcessEnv;
try {
  const settings = existsSync(".data/service.json")
    ? JSON.parse(readFileSync(".data/service.json", "utf8"))
    : {};
  env = {
    ...process.env,
    ...settings,
    PAYMENTS_MODE: "sandbox",
    GEMINI_MODEL: "gemini-3.8-flash",
    WHATSAPP_ALLOWED_SENDERS: "525533734608",
    AGENT_ALLOW_CHECKOUT: "true",
    PORT: "4321",
    REAP_API_KEY: read("StockRescue Reap sandbox"),
    GEMINI_API_KEY: read("GOOGLE_AI_STUDIO_API_KEY"),
    STOCKRESCUE_OWNER_PASSWORD: read("StockRescue Owner"),
    REAP_RETURN_URL: "https://docs.reap.global/agentic-payments/setup",
    REAP_HOSTED_HOSTS: "sandbox.collect.prava.space",
  };
  if (settings.metaConfigured)
    Object.assign(env, JSON.parse(read("StockRescue WhatsApp")));
} catch {
  console.error(
    "Desbloquea 1Password: no fue posible iniciar el servicio protegido.",
  );
  process.exit(1);
}
let child: ChildProcess | undefined,
  tunnel: ChildProcess | undefined,
  stopping = false,
  origin = "",
  tail = "";
function startApp() {
  if (stopping) return;
  child = spawn(
    process.execPath,
    [fileURLToPath(new URL("./mvp.ts", import.meta.url))],
    { env: { ...env, STOCKRESCUE_ORIGIN: origin }, stdio: "inherit" },
  );
  if (env.WHATSAPP_ACCESS_TOKEN && origin) {
    void (async () => {
      for (let attempt = 0; attempt < 30 && !stopping; attempt++) {
        try {
          const r = await fetch("http://127.0.0.1:4321/health", {
            signal: AbortSignal.timeout(1000),
          });
          if (r.ok) {
            await configureMetaWebhook(env, origin);
            console.log("Webhook StockRescue registrado y suscrito en Meta.");
            return;
          }
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      console.error(
        "No se confirmó la suscripción de Meta. Revisar credencial y callback.",
      );
    })();
  }
  child.on("exit", () => {
    child = undefined;
    if (!stopping) setTimeout(startApp, 3000);
  });
}
if (process.argv.includes("--tunnel")) {
  tunnel = spawn(
    "/opt/homebrew/bin/cloudflared",
    ["tunnel", "--url", "http://127.0.0.1:4321", "--no-autoupdate"],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  tunnel.stderr?.on("data", (chunk) => {
    tail = (tail + String(chunk)).slice(-12000);
    const match = tail.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match && !origin) {
      origin = match[0];
      writeFileSync(".data/public-url", origin + "\n", { mode: 0o600 });
      console.log("StockRescue URL: " + origin);
      startApp();
    }
  });
  tunnel.on("exit", () => {
    if (!stopping) {
      stopping = true;
      child?.kill("SIGTERM");
      process.exitCode = 1;
    }
  });
} else startApp();
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    stopping = true;
    child?.kill(signal);
    tunnel?.kill(signal);
  });
