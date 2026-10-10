import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { Store } from "../src/store.ts";
import { Service } from "../src/service.ts";
import { MockAdapter } from "../src/mock.ts";
import {
  analyze,
  initialState,
  digest,
  cents,
  type Incoming,
} from "../src/domain.ts";
import { previewCsv, csvColumns } from "../src/import.ts";
import Papa from "papaparse";
function setup() {
  const store = new Store();
  store.transaction((s) => {
    s.products[0].dailyDemand = 1;
  });
  const adapter = new MockAdapter(store);
  const service = new Service(store, adapter);
  return { store, adapter, service };
}
async function approved(s: Service) {
  const p = s.create("CAFE-250");
  await s.quote(p.id);
  await s.enroll();
  const q = s.view().proposals.find((x) => x.id === p.id)!.quote!;
  s.approve(p.id, digest(q));
  return p.id;
}
test("min-max formula rounds to purchase packs, never orders above reorder point", () => {
  const p = {
    ...initialState().products[0],
    onHand: 8,
    dailyDemand: 6,
    unitsPerPack: 12,
    maxStock: 100,
  };
  const a = analyze(p, []);
  assert.equal(a.purchaseQuantity, 3);
  assert.equal(a.inventoryQuantity, 36);
  assert.equal(a.gapDays, 3 - 8 / 6);
  assert.equal(analyze({ ...p, onHand: 25 }, []).purchaseQuantity, 0);
  assert.equal(analyze({ ...p, dailyDemand: 0 }, []).status, "NO_DEMAND");
  assert.equal(analyze({ ...p, maxStock: 30 }, []).status, "CAPACITY");
  assert.throws(() => analyze({ ...p, reserved: 9 }, []));
});
test("late incoming remains committed without hiding the delivery gap", () => {
  const p = { ...initialState().products[0], dailyDemand: 1 },
    i: Incoming = {
      id: "a",
      proposalId: "a",
      productId: p.id,
      quantity: 4,
      received: 0,
      eta: new Date(Date.now() + 10 * 86400000).toISOString(),
      orderId: "o",
      createdAt: new Date().toISOString(),
      fixture: true,
    };
  const a = analyze(p, [i]);
  assert.equal(a.purchaseQuantity, 0);
  assert.equal(a.lateIncoming, 4);
  assert.equal(a.gapDays, 1);
});
test("money conversion is exact and rejects invalid fractions", () => {
  assert.equal(cents("19.99"), 1999);
  assert.throws(() => cents("0.001"));
  assert.throws(() => cents(-1));
});
test("duplicate creation and concurrent checkout create one order, stock changes only on receipt", async () => {
  const { service: s, adapter: a, store } = setup();
  const id = await approved(s);
  assert.equal(s.create("CAFE-250").id, id);
  await Promise.all([s.checkout(id), s.checkout(id)]);
  const v = s.view();
  assert.equal(a.calls, 1);
  assert.equal(v.incoming.length, 1);
  assert.equal(v.products[0].onHand, 2);
  assert.equal(v.proposals[0].operation?.status, "COMPLETED");
  assert.throws(() => s.create("CAFE-250"), /compra|mercancía/);
  const key = randomUUID();
  s.receive(v.incoming[0].id, 2, key);
  s.receive(v.incoming[0].id, 2, key);
  assert.equal(s.view().products[0].onHand, 4);
  assert.equal(s.view().incoming[0].received, 2);
  assert.throws(() => s.receive(v.incoming[0].id, 3, randomUUID()));
  assert.throws(() => s.receive(v.incoming[0].id, 1, key));
  store.close();
});
test("changed inventory invalidates previous approval", async () => {
  const { service: s, store } = setup();
  const id = await approved(s);
  s.editProduct("CAFE-250", { onHand: 1 });
  await assert.rejects(s.checkout(id));
  assert.equal(s.view().proposals[0].state, "CANCELED");
  store.close();
});
test("requote and shipping changes invalidate approval", async () => {
  const { service: s, store } = setup();
  const id = await approved(s);
  await s.quote(id, "express");
  assert.equal(s.view().proposals[0].approval, undefined);
  await assert.rejects(s.checkout(id));
  store.close();
});
test("provider price changed before charge requires a new approval", async () => {
  const { service: s, adapter: a, store } = setup();
  const id = await approved(s);
  a.getQuote = async (q) => ({ ...q, total: q.total + 100 });
  await assert.rejects(s.checkout(id), /precio|envío/);
  assert.equal(a.calls, 0);
  assert.equal(s.view().proposals[0].state, "QUOTED");
  store.close();
});
test("expired quote and budget are checked server side", async () => {
  const { service: s, store } = setup();
  const id = await approved(s);
  store.transaction((v) => {
    v.proposals[0].quote!.expiresAt = "2020-01-01T00:00:00.000Z";
    v.proposals[0].approval!.hash = digest(v.proposals[0].quote);
  });
  await assert.rejects(s.checkout(id), /venció/);
  assert.throws(() => s.approve(id, "wrong"));
  store.close();
  const other = setup();
  other.service.editProduct("CAFE-250", { budget: 1 });
  const p = other.service.create("CAFE-250");
  await other.service.quote(p.id);
  assert.throws(
    () =>
      other.service.approve(p.id, other.service.view().proposals[0].quoteHash!),
    /presupuesto/,
  );
  other.store.close();
});
test("timeout preserves reservation and replays same operation, even after reopening database", async () => {
  const dir = mkdtempSync(join(".tmp/codex/", "stock-test-"));
  try {
    const path = join(dir, "state.sqlite");
    let store = new Store(path),
      a = new MockAdapter(store),
      s = new Service(store, a);
    const id = await approved(s);
    a.failAfterAcceptance = true;
    await s.checkout(id);
    const op = s.view().proposals[0].operation!;
    assert.equal(op.status, "PENDING");
    assert.ok(s.view().budgetCommitted > 0);
    store.close();
    store = new Store(path);
    a = new MockAdapter(store);
    s = new Service(store, a);
    await s.reconcile(id);
    assert.equal(s.view().proposals[0].operation!.key, op.key);
    assert.equal(s.view().incoming.length, 1);
    assert.equal(a.calls, 0);
    store.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("unknown attempt older than 24h cannot be replayed", async () => {
  const { service: s, adapter: a, store } = setup();
  const id = await approved(s);
  a.checkout = async () => {
    throw new Error("REAP_OUTCOME_UNKNOWN");
  };
  await s.checkout(id);
  store.transaction((v) => {
    v.proposals[0].operation!.createdAt = "2020-01-01T00:00:00.000Z";
  });
  await assert.rejects(s.reconcile(id), /24 horas/);
  assert.ok(s.view().budgetCommitted > 0);
  store.close();
});
test("completed response without final authoritative evidence stays pending", async () => {
  const { service: s, adapter: a, store } = setup();
  const id = await approved(s);
  a.lookup = async (op) => ({
    id: "mock_incomplete",
    status: "COMPLETED",
    quoteId: op.quote.id,
    enrollmentId: op.enrollmentId,
  });
  await s.checkout(id);
  assert.equal(s.view().incoming.length, 0);
  assert.notEqual(s.view().proposals[0].operation?.status, "COMPLETED");
  store.close();
});
test("CSV handles quoted names and blocks duplicates, negative stock and empty numbers", () => {
  const p = initialState().products[1];
  const good = Papa.unparse({
    fields: csvColumns,
    data: [csvColumns.map((k) => p[k as keyof typeof p])],
  });
  assert.equal(previewCsv(good).errors.length, 0);
  assert.ok(previewCsv(good + "\n" + good.split("\n")[1]).errors.length);
  const invalid = good.replace(",72,", ",-2,");
  assert.ok(previewCsv(invalid).errors.length);
  assert.ok(previewCsv("id,name\nA,test").errors.length);
});
test("import preserves incoming and receipt, invalidates unsubmitted proposals", async () => {
  const { service: s, store } = setup();
  const id = await approved(s);
  const p = { ...initialState().products[1], onHand: 90 };
  const csv = Papa.unparse({
    fields: csvColumns,
    data: [csvColumns.map((k) => p[k as keyof typeof p])],
  });
  s.import(csv);
  assert.equal(s.view().products.length, 3);
  assert.equal(s.view().products[1].onHand, 90);
  assert.equal(s.view().proposals.find((p) => p.id === id)!.state, "APPROVED");
  store.close();
});
test("canceled async quote cannot resurrect or create a duplicate purchase", async () => {
  const { service: s, adapter: a, store } = setup();
  let reject: (e: Error) => void = () => {};
  const original = a.quote.bind(a);
  a.quote = () =>
    new Promise((_, r) => {
      reject = r;
    });
  const p = s.create("CAFE-250");
  const pending = s.quote(p.id);
  s.cancel(p.id);
  const next = s.create("CAFE-250");
  reject(new Error("REAP_HTTP_400"));
  await assert.rejects(pending);
  assert.equal(
    s.view().proposals.find((x) => x.id === p.id)!.state,
    "CANCELED",
  );
  a.quote = original;
  await assert.rejects(s.quote(p.id));
  await s.quote(next.id);
  store.close();
});
test("canceled approval cannot resurrect on a late changed quote", async () => {
  const { service: s, adapter: a, store } = setup();
  const id = await approved(s);
  let resolve: (v: typeof q) => void = () => {};
  const q = s.view().proposals[0].quote!;
  a.getQuote = () =>
    new Promise((r) => {
      resolve = r;
    });
  const pending = s.checkout(id);
  s.cancel(id);
  resolve({ ...q, total: q.total + 100 });
  await assert.rejects(pending);
  assert.equal(s.view().proposals[0].state, "CANCELED");
  assert.equal(a.calls, 0);
  store.close();
});
test("canonical linked product cannot be relabeled through supplier changes", () => {
  const { service: s, store } = setup();
  assert.throws(() =>
    s.editProduct("CAFE-250", { supplier: "none", name: "Tornillos" }),
  );
  assert.throws(() => s.editProduct("CAFE-250", { unit: "cajas" }));
  store.close();
});
test("timely incoming covers a projected stock gap", () => {
  const now = Date.now(),
    p = initialState().products[0];
  const i: Incoming = {
    id: "a",
    proposalId: "a",
    productId: p.id,
    quantity: 10,
    received: 0,
    eta: new Date(now + 86400000).toISOString(),
    orderId: "o",
    createdAt: new Date(now).toISOString(),
    fixture: true,
  };
  assert.equal(analyze(p, [i], now).gapDays, 0);
});
test("one active SKU operation across separate service instances", async () => {
  const { service: s, adapter: a, store } = setup();
  const id = await approved(s);
  const other = new Service(store, a);
  a.failAfterAcceptance = true;
  await Promise.all([s.checkout(id), other.checkout(id)]);
  assert.equal(a.calls, 1);
  assert.equal(s.view().proposals.filter((p) => p.operation).length, 1);
  store.close();
});

test("sandbox approval rejects legacy quote without verified quantity evidence", async () => {
  const { store, adapter, service } = setup();
  const id = service.create("CAFE-250").id;
  await service.quote(id);
  Object.defineProperty(adapter, "mode", { value: "REAP_SANDBOX" });
  assert.throws(
    () => service.approve(id, digest(service.view().proposals[0].quote)),
    /cantidad verificada/,
  );
  store.close();
});

test("renewed enrollment retains owner identity and active enrollment is never replaced", async () => {
  const { store, adapter, service } = setup();
  let creates = 0;
  const owners: (string | undefined)[] = [];
  const provider = adapter as import("../src/provider.ts").Provider;
  provider.enroll = async (_email, _key, owner) => {
    creates++;
    owners.push(owner);
    return { id: "e" + creates, status: "REQUIRES_ACTION" };
  };
  provider.getEnrollment = async (id) => ({ id, status: "REQUIRES_ACTION" });
  await service.enroll();
  await service.enroll(true);
  assert.equal(creates, 2);
  assert.equal(owners[0], owners[1]);
  assert.match(owners[0]!, /^stockrescue-/);
  provider.getEnrollment = async (id) => ({ id, status: "ACTIVE" });
  await service.enroll(true);
  assert.equal(creates, 2);
  assert.equal(service.view().enrollment?.status, "ACTIVE");
  store.close();
});

test("decimal demand does not add an extra unit through binary rounding", () => {
  const p = {
    ...initialState().products[0],
    onHand: 0,
    dailyDemand: 0.07,
    leadDays: 98,
    reviewDays: 1,
    safetyDays: 1,
  };
  assert.equal(analyze(p, []).target, 7);
  assert.equal(analyze(p, []).purchaseQuantity, 7);
});
