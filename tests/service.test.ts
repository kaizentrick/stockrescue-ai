import { test } from "node:test";
import assert from "node:assert/strict";
import { Store } from "../src/store.ts";
import { Service, snapshot } from "../src/service.ts";
import {
  workplaces,
  accessories,
  catalog,
  compatible,
  diagnose,
  selectProduct,
} from "../src/domain.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const setup = () => new Service(new Store());
function ready(s: Service, budget = 50000) {
  const c = s.create("P-03", "normal", budget);
  s.diagnose(c.id);
  const q = s.quote(c.id);
  s.approve(c.id, snapshot(q.quote!));
  return c.id;
}
test("diagnóstico sin compra: conexión directa y reutilización", () => {
  assert.equal(diagnose(workplaces[0]).decision, "NO_PURCHASE");
  assert.equal(diagnose(workplaces[1]).accessoryId, "A-01");
  assert.equal(diagnose(workplaces[2]).decision, "BUY");
});
test("accesorio incompatible no es seleccionado por precio; asignado no se roba", () => {
  assert.equal(compatible(workplaces[2], accessories[1]), false);
  assert.equal(selectProduct(workplaces[2]).id, "FIX-ADAPTER-60");
  assert.throws(() =>
    selectProduct(
      workplaces[2],
      catalog.map((p) => ({ ...p, merchant: "unapproved" })),
    ),
  );
});
test("información insuficiente bloquea cotización", () => {
  const s = setup(),
    c = s.create("P-03", "unknown");
  assert.equal(s.diagnose(c.id).diagnosis?.decision, "NEEDS_INFO");
  assert.throws(() => s.quote(c.id));
});
test("sin necesidad de compra nunca busca catálogo", () => {
  const s = setup(),
    c = s.create("P-01");
  s.diagnose(c.id);
  assert.throws(() => s.quote(c.id));
  assert.equal(s.adapter.calls, 0);
});
test("presupuesto excedido bloquea aprobación", () => {
  const s = setup(),
    c = s.create("P-03", "normal", 10000);
  s.diagnose(c.id);
  const q = s.quote(c.id);
  assert.throws(() => s.approve(c.id, snapshot(q.quote!)), /presupuesto/);
});
test("cotización nueva invalida aprobación y snapshot antiguo", async () => {
  const s = setup(),
    id = ready(s),
    old = s.store.get(id).approval!.hash;
  s.quote(id);
  assert.equal(s.store.get(id).approval, undefined);
  assert.throws(() => s.approve(id, old), /cambió/);
  await assert.rejects(s.checkout(id), /aprobación/);
});
test("cotización expirada bloquea aunque estuvo aprobada", async () => {
  let now = Date.now();
  const s = new Service(new Store(), () => now),
    id = ready(s);
  now += 16 * 60000;
  assert.equal(s.view(s.store.get(id)).approvalValid, false);
  await assert.rejects(s.checkout(id), /vencida/);
});
test("doble clic y concurrencia solo hacen una compra", async () => {
  const s = setup(),
    id = ready(s);
  await Promise.all(Array.from({ length: 12 }, () => s.checkout(id)));
  assert.equal(s.adapter.calls, 1);
  assert.equal(s.store.get(id).operation?.status, "COMPLETED");
  assert.equal(
    s.store.db.prepare("SELECT count(*) AS n FROM mock_orders").get()?.n,
    1,
  );
});
test("reserva atómica bloquea presupuesto global insuficiente", async () => {
  const s = setup(),
    id = ready(s);
  s.totalBudget = 30000;
  await assert.rejects(s.checkout(id), /Presupuesto/);
  assert.equal(s.adapter.calls, 0);
});
test("timeout conserva pendiente, reserva y mismo intento; consulta confirma", async () => {
  const s = setup(),
    id = ready(s);
  const pending = await s.checkout(id, "timeout");
  assert.equal(pending.operation?.status, "PENDING");
  const key = pending.operation?.key;
  await s.checkout(id);
  assert.equal(s.adapter.calls, 1);
  assert.equal((await s.reconcile(id)).operation?.key, key);
  assert.equal(s.store.get(id).operation?.status, "COMPLETED");
});
test("cancelación antes de checkout no compra; pendiente no cancela", async () => {
  const s = setup(),
    id = ready(s);
  s.cancel(id);
  await assert.rejects(s.checkout(id));
  assert.equal(s.adapter.calls, 0);
  const second = ready(s);
  await s.checkout(second, "timeout");
  assert.throws(() => s.cancel(second));
});
test("FAILED y EXPIRED requieren nueva cotización y nueva aprobación", async () => {
  for (const outcome of ["failed", "expired"] as const) {
    const s = setup(),
      id = ready(s);
    await s.checkout(id, outcome);
    const key = s.store.get(id).operation?.key;
    s.retry(id);
    await assert.rejects(s.checkout(id));
    const q = s.quote(id);
    s.approve(id, snapshot(q.quote!));
    await s.checkout(id);
    assert.notEqual(s.store.get(id).operation?.key, key);
  }
});
test("persistencia tras reinicio conserva resultado e idempotencia", async () => {
  const dir = mkdtempSync(join(tmpdir(), "reap-test-")),
    path = join(dir, "state.sqlite");
  try {
    const a = new Service(new Store(path)),
      id = ready(a);
    await a.checkout(id, "timeout");
    const key = a.store.get(id).operation?.key;
    a.store.close();
    const b = new Service(new Store(path));
    assert.equal(b.store.get(id).operation?.status, "PENDING");
    assert.equal((await b.reconcile(id)).operation?.key, key);
    assert.equal(b.store.get(id).operation?.status, "COMPLETED");
    b.store.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("repetir reporte del mismo puesto devuelve expediente existente", () => {
  const s = setup();
  assert.equal(s.create("P-03").id, s.create("P-03").id);
});
test("dos conexiones SQLite compiten por presupuesto y no reservan de más", async () => {
  const dir = mkdtempSync(join(tmpdir(), "reap-race-")),
    path = join(dir, "shared.sqlite");
  try {
    const a = new Service(new Store(path), Date.now, 50000),
      id = ready(a);
    const duplicate = structuredClone(a.store.get(id));
    duplicate.id = "second-fixture-case";
    duplicate.workplace.id = "P-OTHER-TEST";
    a.store.save(duplicate);
    const b = new Service(new Store(path), Date.now, 50000);
    const results = await Promise.allSettled([
      a.checkout(id, "timeout"),
      b.checkout(duplicate.id),
    ]);
    assert.equal(results.filter((x) => x.status === "rejected").length, 1);
    assert.equal(a.store.all().filter((c) => c.operation).length, 1);
    a.store.close();
    b.store.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("historial retiene snapshots, aprobaciones e intentos fallidos", async () => {
  const s = setup(),
    id = ready(s);
  const original = s.store.get(id).quote!;
  s.quote(id);
  let c = s.store.get(id);
  assert.equal(c.quoteHistory?.[0].id, original.id);
  assert.equal(c.approvalHistory?.length, 1);
  s.approve(id, snapshot(c.quote!));
  await s.checkout(id, "failed");
  s.retry(id);
  c = s.store.get(id);
  assert.equal(c.attempts?.[0].status, "FAILED");
  assert.equal(c.approvalHistory?.length, 2);
});
test("crash before provider acceptance recovers same operation after restart and concurrent queries", async () => {
  const dir = mkdtempSync(join(tmpdir(), "reap-crash-")),
    path = join(dir, "state.sqlite");
  try {
    const a = new Service(new Store(path)),
      id = ready(a);
    a.adapter.checkout = async () => {
      throw new Error("crash-before-acceptance");
    };
    await a.checkout(id);
    const original = a.store.get(id).operation!;
    assert.equal(
      a.store.db.prepare("SELECT count(*) AS n FROM mock_orders").get()?.n,
      0,
    );
    a.store.close();
    const b = new Service(new Store(path));
    await Promise.all([b.reconcile(id), b.reconcile(id)]);
    assert.equal(b.adapter.calls, 1);
    assert.equal(b.store.get(id).operation?.key, original.key);
    assert.equal(b.store.get(id).operation?.status, "COMPLETED");
    assert.deepEqual(b.store.get(id).operation?.quote, original.quote);
    b.store.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("unknown or insufficient cable cannot establish a compatible video chain", () => {
  const slow = structuredClone(workplaces[0]);
  slow.cable = "HDMI 1.4 · 4K/30";
  slow.cableSpec!.maxHz4k = 30;
  assert.notEqual(diagnose(slow).decision, "NO_PURCHASE");
  const charging = structuredClone(workplaces[1]);
  charging.cable = "USB-C charge only";
  charging.cableSpec = {
    input: "USB-C",
    output: "USB-C",
    protocol: "DATA_ONLY",
    maxHz4k: 0,
  };
  assert.equal(compatible(charging, accessories[0]), false);
  assert.equal(diagnose(charging).decision, "NEEDS_INFO");
  delete charging.cableSpec;
  assert.equal(diagnose(charging).decision, "NEEDS_INFO");
});
