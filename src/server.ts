import { createServer, type IncomingMessage } from "node:http";
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Store } from "./store.ts";
import { Service } from "./service.ts";
import { ReapSandboxAdapter } from "./reap.ts";
import { SandboxProvider } from "./provider.ts";
import { previewCsv, csvColumns } from "./import.ts";
import { initialState } from "./domain.ts";
import Papa from "papaparse";
async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  let value = "";
  for await (const chunk of req) {
    value += String(chunk);
    if (Buffer.byteLength(value) > 220000)
      throw new Error("Solicitud demasiado grande (máximo 200 KB de CSV).");
  }
  const parsed: unknown = JSON.parse(value || "{}");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Solicitud inválida.");
  return parsed as Record<string, unknown>;
}
export function createApp(service: Service, allowedOrigin?: string) {
  return createServer(async (req, res) => {
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
      if (
        req.method === "POST" &&
        (req.headers.origin !== origin ||
          req.headers["x-stockrescue-client"] !== "local" ||
          !req.headers["content-type"]?.startsWith("application/json"))
      ) {
        send({ error: "Origen o formato no permitido." }, 403);
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
        const b = await body(req);
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
        "/style.css": ["style.css", "text/css"],
      };
      if (req.method === "GET" && files[path]) {
        const [file, type] = files[path];
        res.writeHead(200, { "Content-Type": type + "; charset=utf-8" });
        res.end(readFileSync(new URL("../public/" + file, import.meta.url)));
        return;
      }
      send({ error: "Ruta no encontrada." }, 404);
    } catch (e) {
      send({ error: service.safe(e) }, 400);
    }
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mode = process.env.PAYMENTS_MODE ?? "mock";
  if (!["mock", "sandbox"].includes(mode))
    throw new Error(
      "Solo se permiten práctica local y sandbox. Producción está bloqueada.",
    );
  mkdirSync(".data", { recursive: true });
  const store = new Store(
    process.env.STOCKRESCUE_DB ?? `.data/stockrescue-${mode}.sqlite`,
  );
  const provider =
    mode === "sandbox"
      ? new SandboxProvider(
          new ReapSandboxAdapter({
            apiKey: process.env.REAP_API_KEY ?? "",
            mode: "payments",
            returnUrl: process.env.REAP_RETURN_URL ?? "",
            allowedMerchantIds: ["blendstation.com.mx"],
            hostedActionHosts: (
              process.env.REAP_HOSTED_HOSTS ?? "sandbox.collect.prava.space"
            ).split(","),
          }),
        )
      : undefined;
  const app = createApp(
    new Service(store, provider),
    process.env.STOCKRESCUE_ORIGIN,
  );
  const port = Number(process.env.PORT ?? 4317);
  app.listen(port, "127.0.0.1", () =>
    console.log(
      `StockRescue · ${mode === "sandbox" ? "Reap sandbox" : "práctica local"} · http://127.0.0.1:${port}`,
    ),
  );
}
