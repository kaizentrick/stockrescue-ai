import { createServer } from "node:http";
import { createApp } from "../../src/server.ts";
import { Service } from "../../src/service.ts";
import { Operations } from "../../src/operations.ts";
import { AgentStore } from "../../src/agent/store.ts";
import { StockRescueAgent } from "../../src/agent/handler.ts";
import { Store } from "../../src/store.ts";

// This test-only process never constructs a sandbox provider. Every reset uses
// a new in-memory database, so neither project nor test order affects fixtures.
if (process.env.PAYMENTS_MODE !== "mock")
  throw new Error("UI tests require PAYMENTS_MODE=mock.");

let store = new Store(":memory:");
const makeApp = (store: Store) => {
  const service = new Service(store),
    ops = new Operations(service),
    queue = new AgentStore();
  const agent = new StockRescueAgent(service, queue, {
    answer: async () => "Consulta de prueba",
    extract: async () => ({
      kind: "RECEIPT",
      supplier: "Prueba",
      date: "2026-01-01",
      folio: "UI-1",
      currency: "MXN",
      total: 300,
      questions: [],
      lines: [
        {
          description: "Café",
          productId: "CAFE-250",
          quantity: 1,
          unit: "bolsas",
          unitsPerPackage: 1,
          amount: 300,
        },
      ],
    }),
  });
  return createApp(service, undefined, { operations: ops, agent });
};
let application = makeApp(store);
const server = createServer((request, response) => {
  if (
    request.method === "POST" &&
    request.url === "/__test/reset" &&
    request.headers.host === "127.0.0.1:4325" &&
    request.headers["x-stockrescue-test"] === "reset"
  ) {
    store.close();
    application.removeAllListeners();
    store = new Store(":memory:");
    application = makeApp(store);
    response.writeHead(204);
    response.end();
    return;
  }
  application.emit("request", request, response);
});

server.listen(4325, "127.0.0.1", () =>
  console.log("StockRescue UI fixture · mock only · 127.0.0.1:4325"),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    server.close(() => {
      store.close();
      process.exit(0);
    });
  });
