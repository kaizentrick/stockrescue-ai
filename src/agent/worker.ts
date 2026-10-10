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
        response = await this.agent.reply(job.from, job.text);
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
