import { createServer, type IncomingMessage } from "node:http";
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Store } from "./store.ts";
import { Service } from "./service.ts";
import { workplaces, accessories } from "./domain.ts";
import type { MockOutcome } from "./mock.ts";
async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  let text = "";
  for await (const chunk of req) {
    text += String(chunk);
    if (text.length > 8192) throw new Error("Solicitud demasiado grande.");
  }
  const value: unknown = JSON.parse(text || "{}");
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Solicitud inválida.");
  return value as Record<string, unknown>;
}
export function createApp(service: Service) {
  return createServer(async (req, res) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; frame-ancestors 'none'; form-action 'self'",
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    const send = (value: unknown, status = 200) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(value));
    };
    try {
      if (!req.headers.host || !/^127\.0\.0\.1:\d+$/.test(req.headers.host)) {
        send({ error: "Solo se admite el host local 127.0.0.1." }, 403);
        return;
      }
      const path = new URL(req.url || "/", `http://${req.headers.host}`)
        .pathname;
      if (
        req.method === "POST" &&
        (req.headers.origin !== `http://${req.headers.host}` ||
          req.headers["x-workplace-client"] !== "local" ||
          !req.headers["content-type"]?.startsWith("application/json"))
      ) {
        send({ error: "Origen o tipo de solicitud no permitido." }, 403);
        return;
      }
      if (path === "/api/bootstrap" && req.method === "GET") {
        send({
          mode: "LOCAL_SIMULATION",
          workplaces,
          accessories,
          cases: service.store.all().map((c) => service.view(c)),
          budget: service.totalBudget,
        });
        return;
      }
      if (path === "/api/cases" && req.method === "POST") {
        const b = await body(req);
        if (
          typeof b.workplaceId !== "string" ||
          !["normal", "unknown"].includes(String(b.scenario)) ||
          typeof b.budget !== "number"
        )
          throw new Error("Datos de reporte inválidos.");
        send(
          service.view(
            service.create(
              b.workplaceId,
              b.scenario as "normal" | "unknown",
              b.budget,
            ),
          ),
        );
        return;
      }
      const match = path.match(
        /^\/api\/cases\/([a-f0-9-]+)(?:\/(diagnose|quote|approve|checkout|reconcile|cancel|retry))?$/,
      );
      if (match) {
        const [, id, action] = match;
        if (req.method === "GET" && !action) {
          send(service.view(service.store.get(id)));
          return;
        }
        if (req.method === "POST" && action) {
          const b = await body(req);
          let c;
          if (action === "diagnose") c = service.diagnose(id);
          else if (action === "quote") c = service.quote(id);
          else if (action === "approve") {
            if (typeof b.hash !== "string")
              throw new Error("Snapshot requerido.");
            c = service.approve(id, b.hash);
          } else if (action === "retry") c = service.retry(id);
          else if (action === "cancel") c = service.cancel(id);
          else if (action === "reconcile") c = service.reconcile(id);
          else {
            const outcome = String(b.outcome || "completed");
            if (
              !["completed", "timeout", "failed", "expired"].includes(outcome)
            )
              throw new Error("Escenario mock inválido.");
            c = await service.checkout(id, outcome as MockOutcome);
          }
          send(service.view(c));
          return;
        }
      }
      // A browser return is merely navigation. Query parameters are never evidence.
      if (path === "/return") {
        res.writeHead(302, { Location: "/?return=unverified" });
        res.end();
        return;
      }
      const files: Record<string, [string, string]> = {
        "/": ["index.html", "text/html"],
        "/app.js": ["app.js", "text/javascript"],
        "/style.css": ["style.css", "text/css"],
      };
      if (req.method === "GET" && files[path]) {
        const [file, type] = files[path];
        res.writeHead(200, { "Content-Type": type + "; charset=utf-8" });
        res.end(readFileSync(new URL("../public/" + file, import.meta.url)));
        return;
      }
      send({ error: "Ruta no encontrada." }, 404);
    } catch (error) {
      send(
        { error: error instanceof Error ? error.message : "Error local." },
        400,
      );
    }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.env.PAYMENTS_MODE && process.env.PAYMENTS_MODE !== "mock")
    throw new Error(
      "El servidor demo solo admite mock. Completa la integración verificada antes de habilitar Reap.",
    );
  mkdirSync(".data", { recursive: true });
  const service = new Service(new Store(".data/workplace.sqlite"));
  const port = Number(process.env.PORT || 4317);
  createApp(service).listen(port, "127.0.0.1", () =>
    console.log(`Simulación local: http://127.0.0.1:${port}`),
  );
}
