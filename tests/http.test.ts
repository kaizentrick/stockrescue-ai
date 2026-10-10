import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/server.ts";
import { Service, snapshot } from "../src/service.ts";
import { Store } from "../src/store.ts";
test("retorno falsificado no marca éxito y API rechaza cross origin", async () => {
  const s = new Service(new Store()),
    c = s.create("P-03");
  s.diagnose(c.id);
  const q = s.quote(c.id);
  s.approve(c.id, snapshot(q.quote!));
  const app = createApp(s);
  await new Promise<void>((resolve) => app.listen(0, "127.0.0.1", resolve));
  const address = app.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const forged = await fetch(base + `/return?status=COMPLETED&case=${c.id}`, {
      redirect: "manual",
    });
    assert.equal(forged.status, 302);
    assert.equal(s.store.get(c.id).operation, undefined);
    const attack = await fetch(base + `/api/cases/${c.id}/checkout`, {
      method: "POST",
      headers: {
        Origin: "https://evil.example",
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    assert.equal(attack.status, 403);
    assert.equal(s.adapter.calls, 0);
    const valid = await fetch(base + `/api/cases/${c.id}/checkout`, {
      method: "POST",
      headers: {
        Origin: base,
        "Content-Type": "application/json",
        "X-Workplace-Client": "local",
      },
      body: "{}",
    });
    assert.equal(valid.status, 200);
    assert.equal(s.store.get(c.id).operation?.status, "COMPLETED");
  } finally {
    await new Promise<void>((resolve, reject) =>
      app.close((e) => (e ? reject(e) : resolve())),
    );
    s.store.close();
  }
});
