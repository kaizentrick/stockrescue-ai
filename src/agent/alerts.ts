import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createRuntimeService } from "../runtime.ts";
import { digest } from "../domain.ts";
import { loadAgentConfig } from "./config.ts";
import { StockRescueAgent } from "./handler.ts";
import { AgentStore } from "./store.ts";
import { WhatsAppClient } from "./whatsapp.ts";

async function main() {
  const send = process.argv.includes("--send");
  const config = send ? loadAgentConfig() : undefined;
  const service = createRuntimeService();
  // A scheduled alert process must not reset jobs belonging to the gateway.
  const store = new AgentStore();
  const agent = new StockRescueAgent(service, store, {
    answer: async () => "",
  });
  try {
    const alerts = agent.alerts();
    if (!config) {
      console.log(
        JSON.stringify(
          { mode: service.provider.mode, send: false, alerts },
          null,
          2,
        ),
      );
      return;
    }
    mkdirSync(dirname(config.AGENT_DB), { recursive: true });
    const sender = new WhatsAppClient(config);
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
    }).format(new Date());
    // Use a separate alert ledger: opening the gateway DB would recover active jobs.
    const ledger = new AgentStore(config.AGENT_DB + ".alerts");
    try {
      for (const alert of alerts)
        for (const to of config.WHATSAPP_ALLOWED_SENDERS) {
          const key = digest({ day, to, fingerprint: alert.fingerprint });
          if (!ledger.claimAlert(key)) continue;
          try {
            await sender.sendAlert(to, alert.parameters);
            ledger.markAlert(key, "DONE");
          } catch {
            ledger.markAlert(key, "REVIEW");
            throw new Error("ALERT_DELIVERY_REQUIRES_REVIEW");
          }
        }
      console.log(
        "Alertas procesadas; revisar REVIEW ante entregas inciertas.",
      );
    } finally {
      ledger.close();
    }
  } finally {
    store.close();
    service.store.close();
  }
}
main().catch(() => {
  console.error(
    "No se procesaron todas las alertas. Revisa configuración y entregas inciertas antes de repetir.",
  );
  process.exitCode = 1;
});
