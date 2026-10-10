import { documentSchema } from "../operations.ts";
import type { StockRescueAgent } from "./handler.ts";
import type { AgentStore } from "./store.ts";
import type { WhatsAppSender } from "./whatsapp.ts";

export class AgentWorker {
  private running?: Promise<void>;
  store: AgentStore;
  agent: StockRescueAgent;
  sender: WhatsAppSender;
  now: () => number;
  constructor(
    store: AgentStore,
    agent: StockRescueAgent,
    sender: WhatsAppSender,
    now = Date.now,
  ) {
    this.store = store;
    this.agent = agent;
    this.sender = sender;
    this.now = now;
  }
  runOnce(): Promise<void> {
    if (!this.running)
      this.running = this.process().finally(() => {
        this.running = undefined;
      });
    return this.running;
  }
  async idle() {
    await this.running;
  }
  private async process() {
    const job = this.store.claim();
    if (!job) return;
    if (this.now() - job.timestamp >= 24 * 60 * 60 * 1000) {
      this.store.mark(job.id, "REVIEW");
      return;
    }
    let response = job.response;
    if (!response) {
      try {
        if (job.media) {
          if (!this.sender.downloadMedia || !this.agent.ai.extract)
            throw new Error("MEDIA_NOT_CONFIGURED");
          const media = await this.sender.downloadMedia(job.media.id);
          const old = this.agent.operations.documentByHash(media.bytes);
          if (old)
            response =
              "Documento ya registrado: " +
              old.id +
              ". No se duplicó ningún movimiento.";
          else {
            const data = documentSchema.parse(
              await this.agent.ai.extract(
                media.bytes,
                media.mime,
                this.agent.service.view().products.map((p) => ({
                  id: p.id,
                  name: p.name,
                  unit: p.unit,
                })),
              ),
            );
            const doc = this.agent.operations.document(
              media.bytes,
              media.mime,
              data,
              job.from,
            );
            const preview = this.agent.operations.preview(job.from, {
              type: "document",
              documentId: doc.id,
            });
            response =
              "Documento pendiente de revisión, inventario sin cambios.\n" +
              `${data.folio || "Sin folio"} · ${data.supplier} · ${data.kind}\n` +
              data.lines
                .slice(0, 10)
                .map(
                  (l) =>
                    `${l.productId ?? "SKU por confirmar"}: ${l.quantity ?? "?"} ${l.unit}; conversión ${l.unitsPerPackage ?? "?"}.`,
                )
                .join("\n") +
              (data.lines.length > 10 ? "\nMás líneas en la plataforma." : "") +
              (data.questions.length
                ? "\nAclaraciones: " + data.questions.join("; ").slice(0, 500)
                : "") +
              "\nRevisa o corrige en la plataforma. Para confirmar esta revisión: /aceptar " +
              preview.id;
          }
        } else response = await this.agent.reply(job.from, job.text, job.id);
      } catch {
        response =
          "No pude completar la solicitud. Consulta StockRescue antes de repetir una compra. Usa /ayuda para ver los comandos.";
      }
      this.store.mark(job.id, "READY", response);
    }
    if (this.now() - job.timestamp >= 24 * 60 * 60 * 1000) {
      this.store.mark(job.id, "REVIEW");
      return;
    }
    // No blind retry of a Meta POST: a lost response can mean it was delivered.
    this.store.mark(job.id, "SENDING");
    try {
      const outboundId = await this.sender.sendText(job.from, response);
      this.store.mark(job.id, "DONE", undefined, outboundId);
    } catch {
      this.store.mark(job.id, "REVIEW");
    }
  }
}
