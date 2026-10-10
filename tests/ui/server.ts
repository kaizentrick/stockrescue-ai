import { createServer } from "node:http";
import { createApp } from "../../src/server.ts";
import { Service } from "../../src/service.ts";
import { Store } from "../../src/store.ts";

// This test-only process never constructs a sandbox provider. Every reset uses
// a new in-memory database, so neither project nor test order affects fixtures.
if (process.env.PAYMENTS_MODE !== "mock")
  throw new Error("UI tests require PAYMENTS_MODE=mock.");

let store = new Store(":memory:");
let application = createApp(new Service(store));
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
    application = createApp(new Service(store));
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
