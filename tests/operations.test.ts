import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { once } from "node:events";
import { Store } from "../src/store.ts";
import { Service } from "../src/service.ts";
import { Operations, type DocumentData } from "../src/operations.ts";
import { Access } from "../src/access.ts";
import { createApp } from "../src/server.ts";
import { AgentStore } from "../src/agent/store.ts";
import { StockRescueAgent } from "../src/agent/handler.ts";
import { inboundMessages, deliveryStatuses } from "../src/agent/whatsapp.ts";
import { GeminiClient } from "../src/agent/gemini.ts";
import { createAgentServer } from "../src/agent/server.ts";
import { loadAgentConfig } from "../src/agent/config.ts";
const now = Date.parse("2026-10-10T04:00:00Z");
const setup = () => {
  const store = new Store(),
    service = new Service(store, undefined, () => now),
    ops = new Operations(service);
  return { store, service, ops };
};
const sale = {
  productId: "CAFE-250",
  kind: "SALE",
  quantity: 1,
  at: new Date(now).toISOString(),
  note: "Venta de prueba",
};
const doc = (kind: DocumentData["kind"] = "RECEIPT"): DocumentData => ({
  kind,
  supplier: "Proveedor de prueba",
  date: "2026-10-09",
  folio: "DEMO-1",
  currency: "MXN",
  total: 600,
  questions: [],
  lines: [
    {
      description: "Café 250g",
      productId: "CAFE-250",
      quantity: 2,
      unit: "bolsas",
      unitsPerPackage: 1,
      amount: 600,
    },
  ],
});
test("movement confirmation is bound to owner, revision and expiry; repeated confirm is one movement", () => {
  const { store, service, ops } = setup();
  try {
    const p = ops.preview("owner", { type: "movement", input: sale });
    assert.throws(() => ops.confirm("stranger", p.id));
    ops.confirm("owner", p.id);
    ops.confirm("owner", p.id);
    assert.equal(service.view().products[0].onHand, 1);
    assert.equal(ops.view().movements.length, 1);
    const stale = ops.preview("owner", { type: "movement", input: sale });
    service.editProduct("CAFE-250", { dailyDemand: 1 });
    assert.throws(() => ops.confirm("owner", stale.id), /Cambió/);
    const expired = ops.preview("owner", { type: "movement", input: sale });
    service.now = () => now + 660000;
    assert.throws(() => ops.confirm("owner", expired.id), /vencida/);
  } finally {
    store.close();
  }
});
test("insufficient inventory rolls back movement, audit and confirmation status", () => {
  const { store, service, ops } = setup();
  try {
    const p = ops.preview("owner", {
      type: "movement",
      input: { ...sale, quantity: 100 },
    });
    assert.throws(() => ops.confirm("owner", p.id), /excede/);
    assert.equal(service.view().products[0].onHand, 2);
    assert.equal(ops.view().movements.length, 0);
    assert.equal(ops.rows("action_previews")[0].status, "PENDING");
  } finally {
    store.close();
  }
});
test("purchase invoice is archived without stock; receipt unit conversion is atomic and deduplicated by hash and identity", () => {
  const { store, service, ops } = setup();
  try {
    const invoice = ops.document(
      Buffer.from("invoice"),
      "application/pdf",
      doc("PURCHASE"),
      "owner",
    );
    ops.confirm(
      "owner",
      ops.preview("owner", { type: "document", documentId: invoice.id }).id,
    );
    assert.equal(service.view().products[0].onHand, 2);
    const receipt = ops.document(
      Buffer.from("receipt"),
      "application/pdf",
      {
        ...doc(),
        lines: [
          {
            ...doc().lines[0],
            quantity: 1,
            unit: "caja de 2 bolsas",
            unitsPerPackage: 2,
          },
        ],
      },
      "owner",
    );
    const p = ops.preview("owner", {
      type: "document",
      documentId: receipt.id,
    });
    ops.confirm("owner", p.id);
    ops.confirm("owner", p.id);
    assert.equal(service.view().products[0].onHand, 4);
    assert.equal(
      ops.document(Buffer.from("receipt"), "application/pdf", doc(), "owner")
        .duplicate,
      true,
    );
    const duplicate = ops.document(
      Buffer.from("different scan"),
      "application/pdf",
      doc(),
      "owner",
    );
    assert.throws(
      () =>
        ops.confirm(
          "owner",
          ops.preview("owner", { type: "document", documentId: duplicate.id })
            .id,
        ),
      /duplicado/,
    );
    assert.equal(service.view().products[0].onHand, 4);
  } finally {
    store.close();
  }
});
test("document ambiguity, changed preview and multi-line failure never partially change stock", () => {
  const { store, service, ops } = setup();
  try {
    const d = ops.document(
      Buffer.from("scan"),
      "application/pdf",
      { ...doc(), questions: ["¿Caja o bolsa?"] },
      "owner",
    );
    assert.throws(
      () =>
        ops.confirm(
          "owner",
          ops.preview("owner", { type: "document", documentId: d.id }).id,
        ),
      /Aclara/,
    );
    const old = ops.preview("owner", { type: "document", documentId: d.id });
    ops.editDocument(String(d.id), doc());
    assert.throws(() => ops.confirm("owner", old.id), /cambió/);
    ops.editDocument(String(d.id), {
      ...doc("SALE"),
      lines: [doc().lines[0], { ...doc().lines[0], quantity: 100 }],
    });
    assert.throws(
      () =>
        ops.confirm(
          "owner",
          ops.preview("owner", { type: "document", documentId: d.id }).id,
        ),
      /excede/,
    );
    assert.equal(service.view().products[0].onHand, 2);
    assert.equal(ops.view().movements.length, 0);
  } finally {
    store.close();
  }
});
test("reminders and worker exclusivity survive reopen and cannot notify twice", () => {
  mkdirSync(".tmp/codex", { recursive: true });
  const dir = mkdtempSync(".tmp/codex/ops-test-");
  let store = new Store(dir + "/test.sqlite");
  try {
    let service = new Service(store, undefined, () => now),
      ops = new Operations(service);
    ops.confirm(
      "owner",
      ops.preview("owner", {
        type: "reminder",
        input: {
          text: "Revisar café",
          dueAt: "2026-10-09T22:00:01-06:00",
          channel: "web",
          repeat: "none",
        },
      }).id,
    );
    ops.tick();
    assert.equal(ops.view().reminders[0].status, "SCHEDULED");
    assert.equal(ops.lease("one"), true);
    assert.equal(ops.lease("two"), false);
    store.close();
    store = new Store(dir + "/test.sqlite");
    service = new Service(store, undefined, () => now + 2000);
    ops = new Operations(service);
    ops.tick();
    ops.tick();
    assert.equal(ops.view().reminders[0].status, "DONE");
    assert.equal(
      ops.view().notifications.filter((n) => n.text === "Revisar café").length,
      1,
    );
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("simulation is reproducible, respects temporal backtesting and never modifies operational inventory", () => {
  const { store, service, ops } = setup();
  try {
    const before = service.view().products;
    const c = {
      productId: "CAFE-250",
      dailyDemand: 3,
      pattern: "weekly",
      seed: 72,
      uplift: 30,
    };
    const a = ops.simulate(c),
      b = ops.simulate(c);
    assert.deepEqual(a, b);
    for (const e of a.evaluations) {
      const prior = a.series.slice(Math.max(0, e.day - 14), e.day);
      assert.equal(
        e.prediction,
        prior.reduce((x, y) => x + y, 0) / prior.length,
      );
    }
    assert.deepEqual(service.view().products, before);
    assert.match(ops.forecast("CAFE-250").source, /supuesto/);
  } finally {
    store.close();
  }
});
test("web and WhatsApp invoke the same validated proposed action without AI authority to confirm", async () => {
  const { store, service, ops } = setup(),
    queue = new AgentStore();
  try {
    const ai = {
      answer: async () => "",
      plan: async () => ({ name: "movement", args: sale }),
    };
    const agent = new StockRescueAgent(service, queue, ai);
    const id = randomUUID(),
      answer = await agent.reply("525533734608", "Vendí una bolsa", id);
    assert.equal(service.view().products[0].onHand, 2);
    assert.equal(
      await agent.reply("525533734608", "Vendí una bolsa", id),
      answer,
    );
    const token = answer.match(/\/aceptar ([a-f0-9-]{36})/)![1];
    await agent.reply("525533734608", "/aceptar " + token);
    assert.equal(service.view().products[0].onHand, 1);
    assert.equal(ops.view().movements.length, 1);
  } finally {
    queue.close();
    store.close();
  }
});
test("media webhook and delivery event retain official IDs; unrelated phone is ignored", () => {
  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "123" },
              messages: [
                {
                  id: "wamid.test",
                  from: "5215533734608",
                  timestamp: "1791604800",
                  type: "document",
                  document: { id: "555", mime_type: "application/pdf" },
                },
              ],
              statuses: [
                {
                  id: "outbound",
                  status: "delivered",
                  timestamp: "1791604800",
                  recipient_id: "525533734608",
                },
              ],
            },
          },
        ],
      },
    ],
  };
  assert.equal(inboundMessages(payload, "123")[0].from, "525533734608");
  assert.deepEqual(inboundMessages(payload, "123")[0].media, {
    id: "555",
    mime: "application/pdf",
  });
  assert.equal(inboundMessages(payload, "999").length, 0);
  assert.equal(deliveryStatuses(payload, "123")[0].status, "delivered");
});
test("public deployment requires auth; protected state is inaccessible while demo is isolated", async () => {
  const { store, service, ops } = setup();
  assert.throws(
    () => createApp(service, "https://example.com"),
    /autenticación/,
  );
  const password = "a-very-long-random-owner-password";
  const queue = new AgentStore();
  const config = loadAgentConfig({
    GEMINI_API_KEY: "fixture",
    WHATSAPP_ACCESS_TOKEN: "fixture",
    WHATSAPP_PHONE_NUMBER_ID: "123",
    WHATSAPP_APP_SECRET: "fixture-secret",
    WHATSAPP_VERIFY_TOKEN: "fixture-verify-token",
    WHATSAPP_ALLOWED_SENDERS: "525533734608",
  });
  const access = new Access(store.db, password),
    app = createApp(service, undefined, {
      access,
      operations: ops,
      webhook: createAgentServer(config, queue),
    });
  app.listen(0, "127.0.0.1");
  await once(app, "listening");
  const base = "http://127.0.0.1:" + (app.address() as { port: number }).port;
  try {
    const payload = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                metadata: { phone_number_id: "123" },
                messages: [
                  {
                    id: "signed-public",
                    from: "5215533734608",
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    type: "text",
                    text: { body: "/inventario" },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    const signed = {
      method: "POST",
      body: payload,
      headers: {
        "x-hub-signature-256":
          "sha256=" +
          createHmac("sha256", "fixture-secret").update(payload).digest("hex"),
      },
    };
    assert.equal(
      (
        await fetch(base + "/webhooks/whatsapp", {
          method: "POST",
          body: payload,
        })
      ).status,
      401,
    );
    assert.equal(
      (await fetch(base + "/webhooks/whatsapp", signed)).status,
      200,
    );
    assert.equal(
      (await fetch(base + "/webhooks/whatsapp", signed)).status,
      200,
    );
    assert.equal(
      queue.db.prepare("SELECT COUNT(*) AS n FROM agent_jobs").get()?.n,
      1,
    );
    assert.equal((await fetch(base + "/api/bootstrap")).status, 401);
    const demo = await fetch(base + "/api/demo").then((r) => r.json());
    assert.equal(demo.simulation, true);
    assert.equal(demo.proposals, undefined);
    assert.equal((await fetch(base + "/api/operations")).status, 401);
    const r = await fetch(base + "/api/login", {
      method: "POST",
      headers: {
        origin: base,
        "content-type": "application/json",
        "x-stockrescue-client": "local",
      },
      body: JSON.stringify({ password }),
    });
    assert.equal(r.status, 200);
    const cookie = r.headers.get("set-cookie")!;
    assert.match(cookie, /HttpOnly; SameSite=Strict/);
    assert.equal(
      (await fetch(base + "/api/operations", { headers: { cookie } })).status,
      200,
    );
    assert.equal(
      (
        await fetch(base + "/api/actions/confirm", {
          method: "POST",
          headers: { cookie, "content-type": "application/json" },
          body: "{}",
        })
      ).status,
      403,
    );
  } finally {
    app.close();
    await once(app, "close");
    queue.close();
    store.close();
  }
});

test("recurring summary uses current stock when due and cancellation prevents the next occurrence", () => {
  const { store, service, ops } = setup();
  try {
    const p = ops.preview("owner", {
      type: "reminder",
      input: {
        kind: "summary",
        text: "Resumen diario",
        dueAt: "2026-10-09T22:00:01-06:00",
        repeat: "daily",
        channel: "web",
      },
    });
    ops.confirm("owner", p.id);
    ops.confirm(
      "owner",
      ops.preview("owner", { type: "movement", input: sale }).id,
    );
    service.now = () => now + 2000;
    ops.tick();
    ops.tick();
    const summaries = ops
      .view()
      .notifications.filter((n) => String(n.text).startsWith("Resumen diario"));
    assert.equal(summaries.length, 1);
    assert.match(String(summaries[0].text), /1 bolsas/);
    const reminder = ops.view().reminders[0];
    assert.equal(reminder.status, "SCHEDULED");
    ops.confirm(
      "owner",
      ops.preview("owner", { type: "cancelReminder", reminderId: reminder.id })
        .id,
    );
    service.now = () => now + 86402000;
    ops.tick();
    assert.equal(
      ops
        .view()
        .notifications.filter((n) =>
          String(n.text).startsWith("Resumen diario"),
        ).length,
      1,
    );
  } finally {
    store.close();
  }
});

test("Gemini selects one simulation from related read calls and rejects multiple mutations", async () => {
  const make = (names: string[]) =>
    new GeminiClient(
      { GEMINI_API_KEY: "fixture", GEMINI_MODEL: "gemini-3.8-flash" },
      async () =>
        Response.json({
          candidates: [
            {
              content: {
                parts: names.map((name) => ({
                  functionCall: {
                    name,
                    args: { productId: "CAFE-250", uplift: 30 },
                  },
                })),
              },
            },
          ],
        }),
    );
  const plan = await make(["inventory", "simulate", "forecast"]).plan(
    "Simula 30 % más café",
    {},
  );
  assert.ok("name" in plan && plan.name === "simulate");
  const risky = await make(["movement", "simulate"]).plan("Vende y simula", {});
  assert.ok("text" in risky);
});

test("open judge sessions isolate changes, preserve owner state and expose only selected evidence", async () => {
  const { store, service, ops } = setup();
  service.settings({
    ...service.view().settings,
    email: "private@example.com",
  });
  ops.health(
    "Google",
    "CONNECTED",
    "private detail that must not be published",
  );
  const app = createApp(service, undefined, {
    access: new Access(store.db, "owner-password-at-least-24-characters"),
    operations: ops,
    publicDemo: true,
  });
  app.listen(0, "127.0.0.1");
  await once(app, "listening");
  const base = "http://127.0.0.1:" + (app.address() as { port: number }).port;
  const session = async () => {
    const response = await fetch(base + "/demo/");
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Prueba StockRescue sin contraseña/);
    return response.headers.get("set-cookie")!.split(";")[0];
  };
  const request = (cookie: string, path: string, data?: unknown) =>
    fetch(base + path, {
      method: data === undefined ? "GET" : "POST",
      headers: {
        cookie,
        origin: base,
        "content-type": "application/json",
        "x-stockrescue-client": "local",
      },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
  try {
    const root = await fetch(base, { redirect: "manual" });
    assert.equal(root.headers.get("location"), "/demo/");
    assert.equal((await fetch(base + "/api/bootstrap")).status, 401);
    const evidence = JSON.stringify(
      await fetch(base + "/api/evidence").then((r) => r.json()),
    );
    assert.match(evidence, /CONNECTED/);
    assert.doesNotMatch(evidence, /private|address|phone|nextAction/);
    const a = await session(),
      b = await session();
    const edit = await request(a, "/demo/api/products/CAFE-250", { onHand: 7 });
    assert.equal(edit.status, 200);
    assert.equal(
      (await request(a, "/demo/api/bootstrap").then((r) => r.json()))
        .products[0].onHand,
      7,
    );
    assert.equal(
      (await request(b, "/demo/api/bootstrap").then((r) => r.json()))
        .products[0].onHand,
      2,
    );
    assert.equal(service.view().products[0].onHand, 2);
    const document = await request(a, "/demo/api/demo-document", {}).then((r) =>
      r.json(),
    );
    const repeated = await request(a, "/demo/api/demo-document", {}).then((r) =>
      r.json(),
    );
    assert.equal(document.id, repeated.id);
    assert.equal(
      (await request(a, "/demo/api/documents/upload", {})).status,
      400,
    );
    assert.equal(
      (await request(a, "/demo/api/reminders/preview", { channel: "whatsapp" }))
        .status,
      400,
    );
    assert.equal(
      (
        await fetch(base + "/demo/reset", {
          method: "POST",
          headers: { cookie: a },
        })
      ).status,
      403,
    );
    assert.equal((await request(a, "/demo/reset", {})).status, 200);
    assert.equal((await request(a, "/demo/api/bootstrap")).status, 409);
    assert.equal(service.view().products[0].onHand, 2);
  } finally {
    app.close();
    await once(app, "close");
    store.close();
  }
});
