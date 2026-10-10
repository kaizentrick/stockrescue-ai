import { createServer, type IncomingMessage } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Service } from "./service.ts";
import { createRuntimeService } from "./runtime.ts";
import { previewCsv, csvColumns } from "./import.ts";
import { initialState } from "./domain.ts";
import Papa from "papaparse";
import { z } from "zod";
import type { Access } from "./access.ts";
import { Operations, movementSchema, reminderSchema } from "./operations.ts";
import type { StockRescueAgent } from "./agent/handler.ts";
import type { Server } from "node:http";
import { Store } from "./store.ts";
import { DemoSessions, historicalEvidence } from "./public-demo.ts";
async function body(
  req: IncomingMessage,
  limit = 220000,
): Promise<Record<string, unknown>> {
  let value = "";
  for await (const chunk of req) {
    value += String(chunk);
    if (Buffer.byteLength(value) > limit)
      throw new Error("Solicitud demasiado grande (máximo 200 KB de CSV).");
  }
  const parsed: unknown = JSON.parse(value || "{}");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Solicitud inválida.");
  return parsed as Record<string, unknown>;
}
export function createApp(
  service: Service,
  allowedOrigin?: string,
  options: {
    access?: Access;
    operations?: Operations;
    agent?: StockRescueAgent;
    webhook?: Server;
    publicDemo?: boolean;
    practice?: boolean;
  } = {},
) {
  if (
    (options.practice || (options.publicDemo && !options.access)) &&
    service.provider.mode !== "LOCAL_SIMULATION"
  )
    throw new Error("La demo abierta solo admite el proveedor simulado.");
  if (
    allowedOrigin &&
    !options.access &&
    !options.publicDemo &&
    !options.practice
  )
    throw new Error("Configura autenticación antes de publicar el panel.");
  const ops = options.operations;
  const sessions = !options.practice
    ? new DemoSessions((demo, operations, agent) =>
        createApp(demo, allowedOrigin, { operations, agent, practice: true }),
      )
    : undefined;
  const demoService = new Service(new Store());
  const demoOps = new Operations(demoService);
  const app = createServer(async (req, res) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; form-action 'self'; base-uri 'none'",
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
      const local =
        req.headers.host && /^127\.0\.0\.1:\d+$/.test(req.headers.host);
      const publicHost =
        allowedOrigin && req.headers.host === new URL(allowedOrigin).host;
      if (!local && !publicHost) {
        send({ error: "Host no permitido." }, 403);
        return;
      }
      const origin = publicHost ? allowedOrigin : `http://${req.headers.host}`;
      const path = new URL(req.url || "/", origin).pathname;
      if (path === "/webhooks/whatsapp" && options.webhook) {
        options.webhook.emit("request", req, res);
        return;
      }
      if (path === "/api/evidence" && req.method === "GET") {
        send(
          ops && !options.practice
            ? {
                source: "live",
                checkedAt: new Date().toISOString(),
                integrations: ops.view().integrations.map((i) => ({
                  provider: i.provider,
                  status: i.status,
                  at: i.at,
                })),
                operations: service
                  .view()
                  .proposals.filter((p) => p.operation)
                  .map((p) => ({
                    status: p.operation!.status,
                    checkoutId: p.operation!.checkoutId,
                    total: p.operation!.finalAmount ?? p.operation!.quote.total,
                    currency: "MXN",
                  })),
              }
            : historicalEvidence,
        );
        return;
      }
      if (sessions && (path === "/demo" || path.startsWith("/demo/"))) {
        sessions.handle(req, res, origin!);
        return;
      }
      if (
        options.publicDemo &&
        path === "/" &&
        !options.access?.authenticated(req)
      ) {
        res.writeHead(302, { Location: "/demo/" });
        res.end();
        return;
      }
      if (path === "/health" && req.method === "GET") {
        send({ status: "ready" });
        return;
      }
      if (path === "/api/demo" && req.method === "GET") {
        send({
          simulation: true,
          products: demoService.view().products,
          scenario: demoOps.simulate(
            { productId: "CAFE-250", dailyDemand: 3 },
            false,
          ),
        });
        return;
      }
      if (
        req.method === "GET" &&
        ["/login", "/login.js", "/style.css", "/demo.js"].includes(path)
      ) {
        const file = path === "/login" ? "login.html" : path.slice(1);
        res.writeHead(200, {
          "Content-Type": file.endsWith(".html")
            ? "text/html; charset=utf-8"
            : file.endsWith(".js")
              ? "text/javascript; charset=utf-8"
              : "text/css; charset=utf-8",
        });
        res.end(readFileSync(new URL("../public/" + file, import.meta.url)));
        return;
      }
      if (
        req.method === "POST" &&
        (req.headers.origin !== origin ||
          req.headers["x-stockrescue-client"] !== "local" ||
          !req.headers["content-type"]?.startsWith("application/json"))
      ) {
        send({ error: "Origen o formato no permitido." }, 403);
        return;
      }
      if (path === "/api/login" && req.method === "POST" && options.access) {
        const b = await body(req);
        options.access.login(
          req,
          res,
          z.string().max(200).parse(b.password),
          !!publicHost,
        );
        send({ ok: true });
        return;
      }
      if (
        (options.access && !options.access.authenticated(req)) ||
        (options.publicDemo && !options.access)
      ) {
        if (path.startsWith("/api/")) send({ error: "Inicia sesión." }, 401);
        else {
          res.writeHead(302, { Location: "/login" });
          res.end();
        }
        return;
      }
      if (path === "/api/logout" && req.method === "POST" && options.access) {
        options.access.logout(req, res);
        send({ ok: true });
        return;
      }
      if (ops && path === "/api/operations" && req.method === "GET") {
        send({
          ...ops.view(),
          agent: {
            model: process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
            allowCheckout: options.agent?.allowCheckout ?? false,
            practice: options.practice ?? false,
          },
          deliveries: options.agent?.store.db
            .prepare(
              "SELECT d.*,j.text AS message FROM agent_delivery d LEFT JOIN agent_jobs j ON j.outbound_id=d.outbound_id ORDER BY d.at DESC LIMIT 100",
            )
            .all()
            .map((d) => ({
              ...d,
              message:
                d.message ??
                ops.db
                  .prepare("SELECT text FROM notifications WHERE outbound_id=?")
                  .get(d.outbound_id)?.text,
            }))
            .filter((d) => d.message),
          messageReview: options.agent?.store.db
            .prepare(
              "SELECT id,status,timestamp,outbound_id FROM agent_jobs WHERE status='REVIEW' ORDER BY rowid DESC LIMIT 100",
            )
            .all(),
        });
        return;
      }
      if (ops && path.startsWith("/api/forecast/") && req.method === "GET") {
        send(ops.forecast(path.split("/").pop()!));
        return;
      }
      if (path === "/api/bootstrap" && req.method === "GET") {
        send(service.view());
        return;
      }
      if (path === "/api/export" && req.method === "GET") {
        const snapshot = service.view();
        if (snapshot.enrollment) delete snapshot.enrollment.nextAction;
        for (const proposal of snapshot.proposals)
          if (proposal.operation) delete proposal.operation.nextAction;
        send(snapshot);
        return;
      }
      if (path === "/api/template" && req.method === "GET") {
        const csv = Papa.unparse({
          fields: csvColumns,
          data: initialState().products.map((p) =>
            csvColumns.map((k) => p[k as keyof typeof p]),
          ),
        });
        res.writeHead(200, {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="stockrescue-inventario.csv"',
        });
        res.end("\uFEFF" + csv);
        return;
      }
      if (req.method === "POST") {
        const b = await body(
          req,
          path === "/api/documents/upload" ? 12 * 1024 * 1024 : 220000,
        );
        if (ops) {
          const owner = "owner";
          if (options.practice && path === "/api/demo-document") {
            send(
              ops.document(
                Buffer.from(
                  "StockRescue fixture DEMO-JUECES-001; no es una extracción de IA",
                ),
                "application/pdf",
                {
                  kind: "RECEIPT",
                  supplier: "Laboratorio StockRescue · ejemplo",
                  date: "2026-10-09",
                  folio: "DEMO-JUECES-001",
                  currency: "MXN",
                  total: 300,
                  questions: [],
                  lines: [
                    {
                      description: "Café · ejemplo de recepción",
                      productId: "CAFE-250",
                      quantity: 1,
                      unit: "bolsas",
                      unitsPerPackage: 1,
                      amount: 300,
                    },
                  ],
                },
                "demo",
              ),
            );
            return;
          }
          if (options.practice && path === "/api/documents/upload")
            throw new Error(
              "La práctica usa un documento precargado. La extracción de archivos con Gemini se demuestra en el entorno conectado.",
            );
          if (
            options.practice &&
            path === "/api/reminders/preview" &&
            b.channel !== "web"
          )
            throw new Error(
              "En la práctica los avisos se muestran únicamente en esta web.",
            );
          if (path === "/api/chat" && options.agent) {
            send({
              answer: await options.agent.reply(
                owner,
                z.string().min(1).max(4000).parse(b.message),
                z.uuid().parse(b.key),
              ),
            });
            return;
          }
          if (path === "/api/movements/preview") {
            send(
              ops.preview(owner, {
                type: "movement",
                input: movementSchema.parse(b),
              }),
            );
            return;
          }
          if (path === "/api/actions/confirm") {
            send(ops.confirm(owner, z.uuid().parse(b.id)));
            return;
          }
          if (path === "/api/reminders/preview") {
            send(
              ops.preview(owner, {
                type: "reminder",
                input: reminderSchema.parse(b),
              }),
            );
            return;
          }
          if (path === "/api/reminders/cancel") {
            send(
              ops.preview(owner, {
                type: "cancelReminder",
                reminderId: z.uuid().parse(b.id),
              }),
            );
            return;
          }
          if (path === "/api/simulations") {
            send(ops.simulate(b));
            return;
          }
          if (path === "/api/documents/upload") {
            if (!options.agent?.ai.extract)
              throw new Error("Google no está configurado.");
            const mime = z
              .enum(["application/pdf", "image/jpeg", "image/png"])
              .parse(b.mime);
            const bytes = Buffer.from(
              z
                .string()
                .regex(/^[A-Za-z0-9+/]*={0,2}$/)
                .parse(b.base64),
              "base64",
            );
            if (bytes.length > 8 * 1024 * 1024 || bytes.length < 8)
              throw new Error("Tamaño de documento inválido, máximo 8 MB.");
            const valid =
              mime === "application/pdf"
                ? bytes.subarray(0, 5).toString() === "%PDF-"
                : mime === "image/png"
                  ? bytes
                      .subarray(0, 8)
                      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
                  : bytes[0] === 255 && bytes[1] === 216;
            if (!valid)
              throw new Error(
                "El contenido no coincide con el tipo de archivo.",
              );
            const old = ops.documentByHash(bytes);
            if (old) {
              send({ ...old, duplicate: true });
              return;
            }
            const data = await options.agent.ai.extract(
              bytes,
              mime,
              service.view().products.map((p) => ({
                id: p.id,
                name: p.name,
                unit: p.unit,
              })),
            );
            send(ops.document(bytes, mime, data, owner));
            return;
          }
          const doc = path.match(
            /^\/api\/documents\/([a-f0-9-]{36})\/(edit|preview)$/,
          );
          if (doc) {
            if (doc[2] === "edit") {
              ops.editDocument(doc[1], b);
              send({ ok: true });
            } else
              send(
                ops.preview(owner, { type: "document", documentId: doc[1] }),
              );
            return;
          }
        }
        if (path === "/api/settings") service.settings(b);
        else if (path === "/api/import/preview") {
          if (typeof b.csv !== "string") throw new Error("Selecciona un CSV.");
          send(previewCsv(b.csv));
          return;
        } else if (path === "/api/import") {
          if (typeof b.csv !== "string") throw new Error("Selecciona un CSV.");
          service.import(b.csv);
        } else if (path === "/api/enrollment")
          await service.enroll(b.renew === true);
        else if (path === "/api/proposals") {
          if (typeof b.productId !== "string")
            throw new Error("Producto requerido.");
          const p = service.create(b.productId);
          send({ proposalId: p.id, ...service.view() });
          return;
        } else {
          const product = path.match(/^\/api\/products\/([A-Za-z0-9_-]+)$/),
            proposal = path.match(
              /^\/api\/proposals\/([a-f0-9-]+)\/(quote|shipping|approve|checkout|reconcile|cancel)$/,
            ),
            receipt = path.match(/^\/api\/incoming\/([a-f0-9-]+)\/receive$/);
          if (product) service.editProduct(product[1], b);
          else if (receipt) {
            if (typeof b.quantity !== "number" || typeof b.key !== "string")
              throw new Error("Recepción inválida.");
            service.receive(receipt[1], b.quantity, b.key);
          } else if (proposal) {
            const [, id, action] = proposal;
            if (action === "quote") await service.quote(id);
            else if (action === "shipping") {
              if (typeof b.shippingId !== "string")
                throw new Error("Envío requerido.");
              await service.quote(id, b.shippingId);
            } else if (action === "approve") {
              if (typeof b.hash !== "string")
                throw new Error("Cotización requerida.");
              service.approve(id, b.hash);
            } else if (action === "checkout") await service.checkout(id);
            else if (action === "reconcile") await service.reconcile(id);
            else service.cancel(id);
          } else {
            send({ error: "Ruta no encontrada." }, 404);
            return;
          }
        }
        send(service.view());
        return;
      }
      // A redirect is navigation only; the app must query the provider again.
      if (path === "/return") {
        res.writeHead(302, { Location: "/?return=verify" });
        res.end();
        return;
      }
      const files: Record<string, [string, string]> = {
        "/": ["index.html", "text/html"],
        "/app.js": ["app.js", "text/javascript"],
        "/operations.js": ["operations.js", "text/javascript"],
        "/style.css": ["style.css", "text/css"],
      };
      if (req.method === "GET" && files[path]) {
        const [file, type] = files[path];
        res.writeHead(200, { "Content-Type": type + "; charset=utf-8" });
        let content = readFileSync(
          new URL("../public/" + file, import.meta.url),
          "utf8",
        );
        if (options.practice && file === "index.html") {
          content = content
            .replaceAll('href="/', 'href="/demo/')
            .replaceAll('src="/', 'src="/demo/');
          content = content.replace(
            "</head>",
            '<script src="/demo/demo.js" defer></script></head>',
          );
          content = content.replace(
            '<main id="app" aria-busy="true">',
            `<main id="app" aria-busy="true"><section class="notice" aria-label="Demo para jueces"><h2>Prueba StockRescue sin contraseña</h2><p>Tu sesión es independiente. Puedes cotizar, aprobar, recibir y registrar movimientos con datos ficticios. Las compras de esta práctica son simuladas.</p><div class="actions"><button id="demo-reset">Reiniciar mi demo</button><a href="/login">Abrir operación conectada</a><a href="https://github.com/kaizentrick/stockrescue-ai/blob/cx/stockrescue-mvp/docs/DEMO-SCRIPT.md" target="_blank" rel="noreferrer">Guion y evidencia</a></div><details><summary>Evidencia del entorno conectado</summary><div id="demo-evidence">Consultando…</div></details></section>`,
          );
        }
        res.end(content);
        return;
      }
      send({ error: "Ruta no encontrada." }, 404);
    } catch (e) {
      send({ error: service.safe(e) }, 400);
    }
  });
  app.on("close", () => {
    demoService.store.close();
    sessions?.close();
  });
  return app;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mode = process.env.PAYMENTS_MODE ?? "mock";
  const app = createApp(createRuntimeService(), process.env.STOCKRESCUE_ORIGIN);
  const port = Number(process.env.PORT ?? 4317);
  app.listen(port, "127.0.0.1", () =>
    console.log(
      `StockRescue · ${mode === "sandbox" ? "Reap sandbox" : "práctica local"} · http://127.0.0.1:${port}`,
    ),
  );
}
