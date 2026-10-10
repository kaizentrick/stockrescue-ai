import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "../src/server.ts";
import { Service } from "../src/service.ts";
import { Store } from "../src/store.ts";
test("HTTP gates host/origin, keeps secrets server side and ignores forged return status", async () => {
  const store = new Store(),
    service = new Service(store),
    app = createApp(service);
  app.listen(0, "127.0.0.1");
  await once(app, "listening");
  const address = app.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const start = await fetch(base + "/api/bootstrap");
    const body = await start.text();
    assert.match(body, /CAFE-250/);
    assert.doesNotMatch(body, /apiKey|credential|test_card/);
    assert.match(
      start.headers.get("content-security-policy")!,
      /frame-ancestors 'none'/,
    );
    const denied = await fetch(base + "/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: "CAFE-250" }),
    });
    assert.equal(denied.status, 403);
    const valid = await fetch(base + "/api/proposals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: base,
        "X-StockRescue-Client": "local",
      },
      body: JSON.stringify({ productId: "CAFE-250" }),
    });
    assert.equal(valid.status, 200);
    const forged = await fetch(base + "/return?status=COMPLETED", {
      redirect: "manual",
    });
    assert.equal(forged.status, 302);
    assert.equal(service.view().incoming.length, 0);
    assert.equal((await fetch(base + "/api/template")).status, 200);
    assert.equal((await fetch(base + "/../.env")).status, 404);
  } finally {
    app.close();
    await once(app, "close");
    store.close();
  }
});
