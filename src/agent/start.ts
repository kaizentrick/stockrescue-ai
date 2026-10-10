import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { loadAgentConfig } from "./config.ts";
import { GeminiClient } from "./gemini.ts";
import { WhatsAppClient } from "./whatsapp.ts";
import { AgentStore } from "./store.ts";
import { StockRescueAgent } from "./handler.ts";
import { AgentWorker } from "./worker.ts";
import { createAgentServer } from "./server.ts";
import { createRuntimeService } from "../runtime.ts";

async function main() {
  const config = loadAgentConfig();
  if (config.AGENT_DB === ":memory:")
    throw new Error("AGENT_DB requiere un archivo persistente.");
  mkdirSync(dirname(config.AGENT_DB), { recursive: true });
  const service = createRuntimeService();
  const store = new AgentStore(config.AGENT_DB);
  const agent = new StockRescueAgent(
    service,
    store,
    new GeminiClient(config),
    config.AGENT_ALLOW_CHECKOUT === "true",
  );
  const worker = new AgentWorker(store, agent, new WhatsAppClient(config));
  const app = createAgentServer(config, store);
  await new Promise<void>((resolve, reject) => {
    app.once("error", reject);
    app.listen(config.AGENT_PORT, "127.0.0.1", resolve);
  });
  const timer = setInterval(() => {
    void worker
      .runOnce()
      .catch(() =>
        console.error("AGENT_WORKER_ERROR: revisar el estado local."),
      );
  }, 1000);
  console.log(
    `StockRescue agente · ${service.provider.mode} · http://127.0.0.1:${config.AGENT_PORT}`,
  );
  let closing = false;
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.on(signal, () => {
      if (closing) return;
      closing = true;
      clearInterval(timer);
      app.close(() => {
        void worker.idle().then(() => {
          store.close();
          service.store.close();
        });
      });
    });
}
main().catch((e: unknown) => {
  // Config errors name only fields. Runtime errors may contain upstream details.
  console.error(
    e instanceof Error && e.message.startsWith("Configuración del agente")
      ? e.message
      : "No se pudo iniciar el agente. Revisa puertos, base y configuración del proveedor.",
  );
  process.exitCode = 1;
});
