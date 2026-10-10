import { randomUUID } from "node:crypto";
import { chmodSync } from "node:fs";
import { createRuntimeService } from "./runtime.ts";
import { Operations } from "./operations.ts";
import { Access } from "./access.ts";
import { createApp } from "./server.ts";
import { AgentStore } from "./agent/store.ts";
import { StockRescueAgent } from "./agent/handler.ts";
import { GeminiClient } from "./agent/gemini.ts";
import { loadAgentConfig } from "./agent/config.ts";
import { WhatsAppClient } from "./agent/whatsapp.ts";
import { createAgentServer } from "./agent/server.ts";
import { AgentWorker } from "./agent/worker.ts";

const service = createRuntimeService(),
  ops = new Operations(
    service,
    process.env.WHATSAPP_ACCESS_TOKEN ? "whatsapp" : "web",
  ),
  lease = randomUUID();
if (!ops.lease(lease))
  throw new Error("Ya hay un worker activo para esta tienda.");
chmodSync(".data", 0o700);
const store = new AgentStore(
  process.env.AGENT_DB ?? ".data/stockrescue-agent.sqlite",
);
const ai = new GeminiClient({
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
});
const agent = new StockRescueAgent(service, store, ai, true);
const config = process.env.WHATSAPP_ACCESS_TOKEN
  ? loadAgentConfig()
  : undefined;
if (
  config &&
  (config.WHATSAPP_ALLOWED_SENDERS.length !== 1 ||
    config.WHATSAPP_ALLOWED_SENDERS[0] !== "525533734608")
)
  throw new Error("Solo está autorizado el destinatario de prueba actual.");
const sender = config ? new WhatsAppClient(config) : undefined;
const worker = sender ? new AgentWorker(store, agent, sender) : undefined;
const webhook = config ? createAgentServer(config, store) : undefined;
const access = new Access(
  service.store.db,
  process.env.STOCKRESCUE_OWNER_PASSWORD ?? "",
);
const app = createApp(service, process.env.STOCKRESCUE_ORIGIN, {
  access,
  publicDemo: true,
  operations: ops,
  agent,
  webhook,
});
const port = Number(process.env.PORT ?? 4321);
await new Promise<void>((resolve, reject) => {
  app.once("error", reject);
  app.listen(port, "127.0.0.1", resolve);
});
ops.health("Google", "CHECKING", "Validando modelo con Google AI Studio");
void ai
  .answer("Responde solo OK.", {})
  .then(() =>
    ops.health(
      "Google",
      "CONNECTED",
      process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
    ),
  )
  .catch(() =>
    ops.health(
      "Google",
      "ERROR",
      "No se pudo validar el modelo con la cuenta.",
    ),
  );
ops.health(
  "WhatsApp",
  config ? "CONFIGURED" : "PENDING",
  config
    ? "Credenciales configuradas; revisa evidencia de recepción y entrega."
    : "Pendiente configurar app, número y webhook en Meta.",
);
ops.health(
  "Reap",
  service.provider.mode,
  service
    .view()
    .proposals.filter((p) => p.operation)
    .map((p) => p.operation!.status)
    .join(", ") || "Sin operaciones enviadas",
);
ops.db
  .prepare(
    "UPDATE notifications SET status='REVIEW',error='Resultado de envío incierto tras reinicio' WHERE status='SENDING'",
  )
  .run();
let busy = false,
  lastReconcile = 0,
  closing = false;
async function tick() {
  if (busy || closing) return;
  busy = true;
  try {
    ops.tick();
    if (Date.now() - lastReconcile > 60000) {
      lastReconcile = Date.now();
      for (const p of service
        .view()
        .proposals.filter(
          (p) =>
            p.operation?.checkoutId &&
            !["COMPLETED", "FAILED", "EXPIRED"].includes(p.operation.status),
        )) {
        try {
          await service.reconcile(p.id);
          ops.health(
            "Reap",
            service.provider.mode,
            service.view().proposals.find((x) => x.id === p.id)!.operation!
              .status,
          );
        } catch {
          ops.health(
            "Reap",
            "LOOKUP_FAILED",
            "Se conserva el mismo intento y su reserva.",
          );
        }
      }
    }
    if (worker) await worker.runOnce();
    const events = store.db
      .prepare("SELECT * FROM agent_delivery ORDER BY at DESC LIMIT 100")
      .all();
    let latestDelivery: (typeof events)[number] | undefined;
    for (const e of events) {
      const status = String(e.status).toUpperCase();
      ops.db
        .prepare(
          "UPDATE notifications SET status=?,error=? WHERE outbound_id=? AND status NOT IN ('READ','FAILED') AND (? IN ('READ','FAILED') OR status NOT IN ('DELIVERED'))",
        )
        .run(status, e.error, e.outbound_id, status);
      const linked =
        store.db
          .prepare("SELECT 1 FROM agent_jobs WHERE outbound_id=?")
          .get(e.outbound_id) ||
        ops.db
          .prepare("SELECT 1 FROM notifications WHERE outbound_id=?")
          .get(e.outbound_id);
      if (
        !latestDelivery &&
        linked &&
        (e.status === "delivered" || e.status === "read")
      )
        latestDelivery = e;
    }
    if (latestDelivery)
      ops.health(
        "WhatsApp",
        "DELIVERED",
        "Meta confirmó " +
          latestDelivery.status +
          " a las " +
          latestDelivery.at,
        Date.parse(String(latestDelivery.at)),
      );
    const pending = ops.db
      .prepare(
        "SELECT * FROM notifications WHERE channel='whatsapp' AND status='PENDING' ORDER BY rowid LIMIT 1",
      )
      .get();
    if (pending) {
      if (!sender || !config)
        ops.db
          .prepare(
            "UPDATE notifications SET status='REVIEW',error='WhatsApp pendiente de configurar' WHERE id=?",
          )
          .run(pending.id);
      else {
        const last = store.db
          .prepare("SELECT MAX(timestamp) AS at FROM agent_jobs WHERE sender=?")
          .get("525533734608");
        ops.db
          .prepare("UPDATE notifications SET status='SENDING' WHERE id=?")
          .run(pending.id);
        try {
          const id =
            Number(last?.at) > Date.now() - 86400000
              ? await sender.sendText("525533734608", String(pending.text))
              : await sender.sendAlert("525533734608", [
                  "StockRescue",
                  String(pending.text),
                  "Sin compra automática",
                  "Revisar plataforma",
                ]);
          ops.db
            .prepare(
              "UPDATE notifications SET status='SENT',outbound_id=? WHERE id=?",
            )
            .run(id, pending.id);
        } catch (e) {
          const code =
            e instanceof Error && /^WHATSAPP_[A-Z_0-9]+$/.test(e.message)
              ? e.message
              : "RESULTADO_INCIERTO";
          ops.db
            .prepare(
              "UPDATE notifications SET status='REVIEW',error=? WHERE id=?",
            )
            .run(
              "Meta no confirmó el envío; revisar antes de repetir. " + code,
              pending.id,
            );
        }
      }
    }
  } finally {
    busy = false;
  }
}
const timer = setInterval(
  () =>
    void tick().catch(() =>
      ops.health("Worker", "ERROR", "Revisa tareas pendientes."),
    ),
  1000,
);
const heartbeat = setInterval(() => {
  if (!ops.lease(lease)) {
    closing = true;
    clearInterval(timer);
    clearInterval(heartbeat);
    app.close(() => process.exit(1));
  }
}, 5000);
console.log(`StockRescue protegido · http://127.0.0.1:${port} · sandbox`);
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.on(signal, () => {
    if (closing) return;
    closing = true;
    clearInterval(timer);
    clearInterval(heartbeat);
    app.close(() => {
      void (async () => {
        await worker?.idle();
        while (busy) await new Promise((r) => setTimeout(r, 50));
        ops.db.prepare("DELETE FROM worker_lease WHERE owner=?").run(lease);
        store.close();
        service.store.close();
      })();
    });
  });
