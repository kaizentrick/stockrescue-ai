import { randomBytes } from "node:crypto";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { Store } from "./store.ts";
import { Service } from "./service.ts";
import { Operations } from "./operations.ts";
import { AgentStore } from "./agent/store.ts";
import { StockRescueAgent } from "./agent/handler.ts";

// Recorded provider evidence, never presented as a current connection on another Mac.
export const historicalEvidence = {
  source: "historical",
  checkedAt: "2026-10-10T05:02:45.000Z",
  integrations: [
    { provider: "Google AI Studio · gemini-3.8-flash", status: "CONNECTED" },
    {
      provider: "WhatsApp Cloud API",
      status: "DELIVERED",
      at: "2026-10-10T04:59:39.000Z",
    },
  ],
  operations: [
    {
      status: "PROCESSING",
      checkoutId: "cc6753a9-1f2a-4eb8-8ed0-69b8b3fa4db6",
      total: 36000,
      currency: "MXN",
    },
  ],
};

type Session = {
  app: Server;
  service: Service;
  ops: Operations;
  queue: AgentStore;
  at: number;
  requests: number;
};
export class DemoSessions {
  sessions = new Map<string, Session>();
  factory: (
    service: Service,
    ops: Operations,
    agent: StockRescueAgent,
  ) => Server;
  timer: ReturnType<typeof setInterval>;
  constructor(factory: DemoSessions["factory"]) {
    this.factory = factory;
    this.timer = setInterval(() => {
      for (const [id, session] of this.sessions) {
        if (Date.now() - session.at > 3600000) this.remove(id);
        else session.ops.tick();
      }
    }, 1000);
    this.timer.unref();
  }
  remove(id: string) {
    const s = this.sessions.get(id);
    if (!s) return;
    s.app.emit("close");
    s.queue.close();
    s.service.store.close();
    this.sessions.delete(id);
  }
  handle(req: IncomingMessage, res: ServerResponse, origin: string) {
    const path = new URL(req.url!, origin).pathname;
    if (path === "/demo") {
      res.writeHead(302, { Location: "/demo/" });
      res.end();
      return;
    }
    if (
      req.method !== "GET" &&
      (req.method !== "POST" ||
        req.headers.origin !== origin ||
        req.headers["x-stockrescue-client"] !== "local" ||
        !req.headers["content-type"]?.startsWith("application/json"))
    ) {
      res.writeHead(403);
      res.end();
      return;
    }
    let id =
      (req.headers.cookie ?? "")
        .split(";")
        .map((v) => v.trim())
        .find((v) => v.startsWith("sr_demo="))
        ?.slice(8) ?? "";
    if (path === "/demo/reset" && req.method === "POST") {
      this.remove(id);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"ok":true}');
      return;
    }
    let session = this.sessions.get(id);
    if (!session) {
      // Sessions are created only on navigation, not by anonymous parallel API requests.
      if (path !== "/demo/" || req.method !== "GET") {
        res.writeHead(409, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error:
              "La sesión de prueba terminó. Recarga la página para iniciar otra.",
          }),
        );
        return;
      }
      if (this.sessions.size >= 30) {
        res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("La demo está ocupada. Intenta más tarde.");
        return;
      }
      id = randomBytes(24).toString("hex");
      const service = new Service(new Store()),
        ops = new Operations(service),
        queue = new AgentStore();
      const agent = new StockRescueAgent(
        service,
        queue,
        {
          answer: async () =>
            "Esta práctica no llama a Gemini. Prueba /inventario, /pedidos, /reporte o /cotizar CAFE-250. El video y QA documentan la conversación real con Google y WhatsApp.",
        },
        true,
      );
      session = {
        app: this.factory(service, ops, agent),
        service,
        ops,
        queue,
        at: Date.now(),
        requests: 0,
      };
      this.sessions.set(id, session);
      res.setHeader(
        "Set-Cookie",
        `sr_demo=${id}; HttpOnly; SameSite=Strict; Path=/demo; Max-Age=3600${origin.startsWith("https:") ? "; Secure" : ""}`,
      );
    }
    if (++session.requests > 3000) {
      res.writeHead(429, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Reinicia tu sesión de demostración para continuar.",
        }),
      );
      return;
    }
    session.at = Date.now();
    req.url = req.url!.slice(5);
    session.app.emit("request", req, res);
  }
  close() {
    clearInterval(this.timer);
    for (const id of this.sessions.keys()) this.remove(id);
  }
}
