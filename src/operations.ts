import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { Service } from "./service.ts";
import type { State } from "./domain.ts";

export const movementSchema = z
  .object({
    productId: z.string().min(1).max(40),
    kind: z.enum([
      "SALE",
      "CONSUMPTION",
      "RETURN",
      "WASTE",
      "ADJUSTMENT",
      "RECEIPT",
    ]),
    quantity: z
      .number()
      .int()
      .min(-1_000_000)
      .max(1_000_000)
      .refine((n) => n !== 0),
    at: z.iso.datetime({ offset: true }),
    note: z.string().trim().min(3).max(500),
  })
  .refine((v) => v.kind === "ADJUSTMENT" || v.quantity > 0, {
    message: "Usa una cantidad positiva.",
  });
export type MovementInput = z.infer<typeof movementSchema>;
export const documentSchema = z.object({
  kind: z.enum(["PURCHASE", "SALE", "RECEIPT", "UNKNOWN"]),
  supplier: z.string().max(200),
  date: z.string().max(40),
  folio: z.string().max(150),
  currency: z.enum(["MXN", "UNKNOWN"]),
  total: z.number().nonnegative().nullable(),
  questions: z.array(z.string().max(500)).max(30),
  lines: z
    .array(
      z.object({
        description: z.string().max(300),
        productId: z.string().max(40).nullable(),
        quantity: z.number().positive().nullable(),
        unit: z.string().max(50),
        unitsPerPackage: z.number().int().positive().max(100000).nullable(),
        amount: z.number().nonnegative().nullable(),
      }),
    )
    .max(150),
});
export type DocumentData = z.infer<typeof documentSchema>;
export const reminderSchema = z.object({
  kind: z.enum(["reminder", "summary"]).default("reminder"),
  text: z.string().trim().min(3).max(800),
  dueAt: z.iso.datetime({ offset: true }),
  repeat: z.enum(["none", "daily", "weekly"]).default("none"),
  channel: z.enum(["web", "whatsapp"]).default("web"),
});
export const scenarioSchema = z.object({
  productId: z.string(),
  seed: z.number().int().min(1).max(2147483647).default(42),
  days: z.number().int().min(28).max(180).default(56),
  pattern: z
    .enum(["regular", "weekly", "promotion", "delay"])
    .default("weekly"),
  uplift: z.number().min(-90).max(300).default(30),
  delayDays: z.number().int().min(0).max(90).default(0),
  dailyDemand: z.number().min(0).max(10000).optional(),
});
const day = 86400000;
const iso = (n: number) => new Date(n).toISOString();
export class Operations {
  service: Service;
  notificationChannel: string;
  constructor(service: Service, notificationChannel = "web") {
    this.notificationChannel = notificationChannel;
    this.service = service;
    this.db
      .exec(`CREATE TABLE IF NOT EXISTS movements (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, kind TEXT NOT NULL, quantity INTEGER NOT NULL, at TEXT NOT NULL, origin TEXT NOT NULL, reference TEXT NOT NULL, note TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, hash TEXT UNIQUE NOT NULL, identity TEXT UNIQUE, status TEXT NOT NULL, data TEXT NOT NULL, mime TEXT NOT NULL, content BLOB NOT NULL, origin TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS action_previews (id TEXT PRIMARY KEY, owner TEXT NOT NULL, data TEXT NOT NULL, revisions TEXT NOT NULL, expires_at INTEGER NOT NULL, status TEXT NOT NULL, result TEXT);
    CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, owner TEXT NOT NULL, question TEXT NOT NULL, answer TEXT NOT NULL, at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY, owner TEXT NOT NULL, data TEXT NOT NULL, due_at TEXT NOT NULL, status TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, fingerprint TEXT UNIQUE NOT NULL, text TEXT NOT NULL, at TEXT NOT NULL, channel TEXT NOT NULL, status TEXT NOT NULL, outbound_id TEXT, error TEXT);
    CREATE TABLE IF NOT EXISTS simulations (id TEXT PRIMARY KEY, data TEXT NOT NULL, at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS integration_health (provider TEXT PRIMARY KEY, status TEXT NOT NULL, at TEXT NOT NULL, detail TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS worker_lease (id INTEGER PRIMARY KEY CHECK(id=1), owner TEXT NOT NULL, expires INTEGER NOT NULL);`);
  }
  get db() {
    return this.service.store.db;
  }
  rows(table: string) {
    if (
      ![
        "movements",
        "documents",
        "action_previews",
        "reminders",
        "notifications",
        "simulations",
        "conversations",
        "integration_health",
      ].includes(table)
    )
      throw new Error("Tabla inválida");
    return this.db
      .prepare(`SELECT * FROM ${table} ORDER BY rowid DESC LIMIT 300`)
      .all() as Record<string, unknown>[];
  }
  view() {
    return {
      movements: this.rows("movements"),
      documents: this.db
        .prepare(
          "SELECT id,status,data,origin,created_at FROM documents ORDER BY rowid DESC LIMIT 100",
        )
        .all()
        .map(
          (r) =>
            ({ ...r, data: JSON.parse(r.data as string) }) as Record<
              string,
              unknown
            > & { data: DocumentData },
        ),
      reminders: this.rows("reminders").map(
        (r) =>
          ({ ...r, data: JSON.parse(r.data as string) }) as Record<
            string,
            unknown
          > & { data: z.infer<typeof reminderSchema> },
      ),
      notifications: this.rows("notifications"),
      simulations: this.rows("simulations").map((r) => ({
        ...r,
        data: JSON.parse(r.data as string),
      })),
      integrations: this.rows("integration_health"),
      timezone: "America/Mexico_City",
    };
  }
  health(
    provider: string,
    status: string,
    detail: string,
    at = this.service.now(),
  ) {
    this.db
      .prepare(
        "INSERT INTO integration_health VALUES (?,?,?,?) ON CONFLICT(provider) DO UPDATE SET status=excluded.status, at=excluded.at, detail=excluded.detail",
      )
      .run(provider, status, iso(at), detail.slice(0, 250));
  }
  movement(
    s: State,
    input: MovementInput,
    key: string,
    origin: string,
    reference = "",
  ) {
    const m = movementSchema.parse(input);
    if (Date.parse(m.at) > this.service.now() + 300000)
      throw new Error("La fecha del movimiento está en el futuro.");
    const existing = this.db
      .prepare("SELECT * FROM movements WHERE id=?")
      .get(key);
    const delta = ["SALE", "CONSUMPTION", "WASTE"].includes(m.kind)
      ? -m.quantity
      : m.quantity;
    if (existing) {
      if (
        existing.product_id !== m.productId ||
        existing.kind !== m.kind ||
        existing.quantity !== delta ||
        existing.reference !== reference
      )
        throw new Error("La clave ya identifica otro movimiento.");
      return;
    }
    const p = s.products.find((p) => p.id === m.productId);
    if (!p) throw new Error("SKU no encontrado.");
    if (p.onHand + delta < p.reserved || p.onHand + delta > p.maxStock)
      throw new Error(
        "El movimiento excede existencias disponibles o capacidad.",
      );
    p.onHand += delta;
    p.revision++;
    this.service.invalidate(s, p.id);
    this.db
      .prepare("INSERT INTO movements VALUES (?,?,?,?,?,?,?,?)")
      .run(key, p.id, m.kind, delta, m.at, origin, reference, m.note);
  }
  applyMovement(input: unknown, key: string, origin: string) {
    z.uuid().parse(key);
    return this.service.store.transaction((s) =>
      this.movement(s, movementSchema.parse(input), key, origin),
    );
  }
  preview(owner: string, data: unknown) {
    const action = z.object({ type: z.string() }).passthrough().parse(data);
    if (action.type === "document") {
      const row = this.db
        .prepare("SELECT data FROM documents WHERE id=?")
        .get(z.string().parse(action.documentId));
      if (!row) throw new Error("Documento no encontrado.");
      action.documentHash = createHash("sha256")
        .update(row.data as string)
        .digest("hex");
    }
    data = action;
    const id = randomUUID();
    const revisions = this.service.store
      .read()
      .products.map((p) => [p.id, p.revision]);
    this.db
      .prepare("INSERT INTO action_previews VALUES (?,?,?,?,?,?,NULL)")
      .run(
        id,
        owner,
        JSON.stringify(data),
        JSON.stringify(revisions),
        this.service.now() + 600000,
        "PENDING",
      );
    return { id, data, expiresAt: iso(this.service.now() + 600000) };
  }
  confirm(owner: string, id: string) {
    return this.service.store.transaction((s) => {
      const p = this.db
        .prepare("SELECT * FROM action_previews WHERE id=? AND owner=?")
        .get(id, owner);
      if (!p) throw new Error("Propuesta no encontrada para este usuario.");
      if (p.status === "DONE") return JSON.parse(p.result as string);
      if ((p.expires_at as number) <= this.service.now())
        throw new Error("Propuesta vencida.");
      const action = JSON.parse(p.data as string);
      if (["movement", "document", "receive"].includes(action.type)) {
        const revisions = new Map(
          JSON.parse(p.revisions as string) as [string, number][],
        );
        if (s.products.some((x) => revisions.get(x.id) !== x.revision))
          throw new Error("Cambió el inventario; revisa una nueva propuesta.");
      }
      if (action.type === "movement")
        this.movement(s, movementSchema.parse(action.input), id, owner);
      else if (action.type === "receive") {
        const incoming = s.incoming.find((i) => i.id === action.incomingId);
        if (
          !incoming ||
          !Number.isSafeInteger(action.quantity) ||
          action.quantity < 1 ||
          action.quantity > incoming.quantity - incoming.received
        )
          throw new Error("Cantidad superior al saldo pendiente.");
        this.movement(
          s,
          {
            productId: incoming.productId,
            kind: "RECEIPT",
            quantity: action.quantity,
            at: iso(this.service.now()),
            note: "Recepción del pedido " + incoming.orderId,
          },
          id,
          owner,
          incoming.id,
        );
        incoming.received += action.quantity;
        s.receipts.push({
          key: id,
          incomingId: incoming.id,
          quantity: action.quantity,
          at: iso(this.service.now()),
        });
        this.service.audit(
          this.service.find(s, incoming.proposalId),
          "RECEIVED",
          String(action.quantity) + " unidades recibidas.",
        );
      } else if (action.type === "document") {
        const row = this.db
          .prepare("SELECT data FROM documents WHERE id=?")
          .get(action.documentId);
        if (
          !row ||
          createHash("sha256")
            .update(row.data as string)
            .digest("hex") !== action.documentHash
        )
          throw new Error("El documento cambió. Revisa otra propuesta.");
        this.confirmDocument(s, action.documentId, owner);
      } else if (action.type === "reminder") {
        const r = reminderSchema.parse(action.input);
        if (Date.parse(r.dueAt) <= this.service.now())
          throw new Error("El recordatorio debe estar en el futuro.");
        this.db
          .prepare("INSERT INTO reminders VALUES (?,?,?,?,?)")
          .run(
            id,
            owner,
            JSON.stringify(r),
            iso(Date.parse(r.dueAt)),
            "SCHEDULED",
          );
      } else if (action.type === "cancelReminder") {
        if (
          this.db
            .prepare(
              "UPDATE reminders SET status='CANCELED' WHERE id=? AND owner=? AND status='SCHEDULED'",
            )
            .run(action.reminderId, owner).changes !== 1
        )
          throw new Error("Recordatorio no disponible.");
      } else throw new Error("Acción no permitida.");
      const result = { status: "DONE", id, at: iso(this.service.now()) };
      this.db
        .prepare(
          "UPDATE action_previews SET status='DONE', result=? WHERE id=?",
        )
        .run(JSON.stringify(result), id);
      return result;
    });
  }
  document(bytes: Buffer, mime: string, data: unknown, origin: string) {
    if (bytes.length > 8 * 1024 * 1024)
      throw new Error("Documento demasiado grande: máximo 8 MB.");
    const parsed = documentSchema.parse(data),
      hash = createHash("sha256").update(bytes).digest("hex");
    const old = this.db
      .prepare("SELECT id FROM documents WHERE hash=?")
      .get(hash);
    if (old) return { id: old.id, duplicate: true };
    const id = randomUUID();
    this.db
      .prepare("INSERT INTO documents VALUES (?,?,NULL,?,?,?,?,?,?)")
      .run(
        id,
        hash,
        "REVIEW",
        JSON.stringify(parsed),
        mime,
        bytes,
        origin,
        iso(this.service.now()),
      );
    return { id, duplicate: false };
  }
  documentByHash(bytes: Buffer) {
    return this.db
      .prepare("SELECT id,status FROM documents WHERE hash=?")
      .get(createHash("sha256").update(bytes).digest("hex"));
  }
  editDocument(id: string, data: unknown) {
    const d = documentSchema.parse(data);
    if (
      this.db
        .prepare("UPDATE documents SET data=? WHERE id=? AND status='REVIEW'")
        .run(JSON.stringify(d), id).changes !== 1
    )
      throw new Error("El documento ya fue confirmado o no existe.");
  }
  confirmDocument(s: State, id: string, origin: string) {
    const row = this.db.prepare("SELECT * FROM documents WHERE id=?").get(id);
    if (!row) throw new Error("Documento no encontrado.");
    if (row.status === "CONFIRMED") return;
    const d = documentSchema.parse(JSON.parse(row.data as string));
    if (
      d.kind === "UNKNOWN" ||
      !d.supplier.trim() ||
      !d.folio.trim() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(d.date) ||
      !Number.isFinite(Date.parse(d.date)) ||
      new Date(d.date).toISOString().slice(0, 10) !== d.date ||
      d.questions.length ||
      !d.lines.length
    )
      throw new Error(
        "Aclara tipo, proveedor, fecha, folio y preguntas pendientes.",
      );
    const identity = [
      d.kind,
      d.supplier.trim().toLowerCase(),
      d.folio.trim().toLowerCase(),
      d.date,
    ].join("|");
    if (
      this.db
        .prepare("SELECT id FROM documents WHERE identity=? AND id<>?")
        .get(identity, id)
    )
      throw new Error(
        "Documento duplicado: mismo tipo, proveedor, folio y fecha.",
      );
    for (const [i, line] of d.lines.entries()) {
      const p = s.products.find((p) => p.id === line.productId);
      if (
        !p ||
        line.quantity === null ||
        line.unitsPerPackage === null ||
        !line.unit.trim()
      )
        throw new Error(
          "Relaciona cada línea con su SKU y conversión explícita de unidades.",
        );
      const qty = line.quantity * line.unitsPerPackage;
      if (!Number.isSafeInteger(qty) || qty <= 0)
        throw new Error("La cantidad convertida debe ser entera.");
      if (d.kind !== "PURCHASE")
        this.movement(
          s,
          {
            productId: p.id,
            kind: d.kind === "SALE" ? "SALE" : "RECEIPT",
            quantity: qty,
            at: new Date(d.date + "T00:00:00-06:00").toISOString(),
            note: `${d.kind} ${d.folio}: ${line.quantity} ${line.unit} × ${line.unitsPerPackage} ${p.unit}`,
          },
          `${id}:${i}`,
          origin,
          id,
        );
    }
    this.db
      .prepare("UPDATE documents SET status='CONFIRMED',identity=? WHERE id=?")
      .run(identity, id);
  }
  history(owner: string) {
    return this.db
      .prepare(
        "SELECT question,answer,at FROM conversations WHERE owner=? ORDER BY rowid DESC LIMIT 12",
      )
      .all(owner)
      .reverse();
  }
  remember(owner: string, id: string, question: string, answer: string) {
    this.db
      .prepare("INSERT OR IGNORE INTO conversations VALUES (?,?,?,?,?)")
      .run(
        id,
        owner,
        question.slice(0, 4000),
        answer.slice(0, 12000),
        iso(this.service.now()),
      );
  }
  notification(
    fingerprint: string,
    text: string,
    channel = this.notificationChannel,
  ) {
    const id = randomUUID();
    this.db
      .prepare(
        "INSERT OR IGNORE INTO notifications VALUES (?,?,?,?,?,?,NULL,NULL)",
      )
      .run(
        id,
        fingerprint,
        text,
        iso(this.service.now()),
        channel,
        channel === "web" ? "DELIVERED" : "PENDING",
      );
  }
  summary(title: string) {
    const state = this.service.view();
    return (
      `${title}\nResumen StockRescue · ${new Date(this.service.now()).toLocaleString("es-MX", { timeZone: "America/Mexico_City" })}\n` +
      state.products
        .map(
          (p) =>
            `${p.name}: ${p.onHand} ${p.unit}; ${p.analysis.status === "REORDER" ? "requiere reposición" : "sin alerta de reposición"}.`,
        )
        .join("\n") +
      `\nPedidos en seguimiento: ${state.proposals.filter((p) => p.operation && !["COMPLETED", "FAILED", "EXPIRED"].includes(p.operation.status)).length}. Documentos por revisar: ${this.db.prepare("SELECT COUNT(*) AS n FROM documents WHERE status='REVIEW'").get()?.n}.`
    );
  }
  tick() {
    this.service.store.transaction((s) => {
      for (const row of this.db
        .prepare(
          "SELECT * FROM reminders WHERE status='SCHEDULED' AND due_at<=?",
        )
        .all(iso(this.service.now()))) {
        const r = reminderSchema.parse(JSON.parse(row.data as string));
        this.notification(
          `reminder:${row.id}:${row.due_at}`,
          r.kind === "summary" ? this.summary(r.text) : r.text,
          r.channel,
        );
        if (r.repeat === "none")
          this.db
            .prepare("UPDATE reminders SET status='DONE' WHERE id=?")
            .run(row.id);
        else {
          let due = Date.parse(row.due_at as string);
          const step = r.repeat === "daily" ? day : 7 * day;
          while (due <= this.service.now()) due += step;
          this.db
            .prepare("UPDATE reminders SET due_at=? WHERE id=?")
            .run(iso(due), row.id);
        }
      }
      for (const p of this.service.view().products)
        if (p.analysis.status === "REORDER")
          this.notification(
            `stock:${p.id}:${p.revision}`,
            `Stock bajo: ${p.name}. ${p.analysis.available} ${p.unit}; sugerencia ${p.analysis.inventoryQuantity}.`,
          );
      for (const p of s.proposals) {
        if (
          p.quote &&
          !p.operation &&
          p.state !== "CANCELED" &&
          Date.parse(p.quote.expiresAt) > this.service.now() &&
          Date.parse(p.quote.expiresAt) - this.service.now() < 120000
        )
          this.notification(
            `quote:${p.quote.id}`,
            `Cotización ${p.id} próxima a vencer.`,
          );
        if (p.operation)
          this.notification(
            `order:${p.id}:${p.operation.status}`,
            `Pedido ${p.id}: ${p.operation.status}. ${p.operation.note}`,
          );
      }
      for (const r of s.incoming)
        if (r.received < r.quantity)
          this.notification(
            `receive:${r.id}:${r.received}`,
            `Mercancía pendiente: ${r.quantity - r.received} unidades de ${r.productId}. Entrega estimada ${r.eta}.`,
          );
    });
  }
  lease(owner: string) {
    return (
      this.db
        .prepare(
          "INSERT INTO worker_lease VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,expires=excluded.expires WHERE worker_lease.owner=excluded.owner OR worker_lease.expires<?",
        )
        .run(owner, this.service.now() + 30000, this.service.now()).changes ===
      1
    );
  }
  forecast(productId: string, uplift = 0) {
    const p = this.service.view().products.find((p) => p.id === productId);
    if (!p) throw new Error("SKU no encontrado.");
    const events = this.db
      .prepare(
        "SELECT at,quantity FROM movements WHERE product_id=? AND kind IN ('SALE','CONSUMPTION') AND at<? ORDER BY at",
      )
      .all(productId, iso(this.service.now())) as {
      at: string;
      quantity: number;
    }[];
    const today = new Date(this.service.now()).toLocaleDateString("en-CA", {
      timeZone: "America/Mexico_City",
    });
    const cutoff = Date.parse(today + "T00:00:00-06:00");
    const first = events.length ? Date.parse(events[0].at) : cutoff;
    const days = Math.min(28, Math.max(0, Math.floor((cutoff - first) / day)));
    const observed = days >= 7;
    const daily = observed
      ? events
          .filter(
            (e) =>
              Date.parse(e.at) >= cutoff - days * day &&
              Date.parse(e.at) < cutoff,
          )
          .reduce((n, e) => n - e.quantity, 0) / days
      : p.dailyDemand;
    const adjusted = daily * (1 + uplift / 100),
      coverage = adjusted ? p.analysis.available / adjusted : null;
    return {
      productId,
      source: observed
        ? "historial"
        : "supuesto editable: consumo diario del inventario",
      observedDays: days,
      dailyDemand: adjusted,
      nextWeek: adjusted * 7,
      coverageDays: coverage,
      shortageRisk: coverage !== null && coverage < p.leadDays,
      recommendedUnits: Math.max(
        0,
        Math.ceil(
          adjusted * (p.leadDays + p.reviewDays + p.safetyDays) -
            p.analysis.position,
        ),
      ),
      currentMinMax: p.analysis.inventoryQuantity,
      uplift,
    };
  }
  simulate(input: unknown, save = true) {
    const c = scenarioSchema.parse(input),
      p = this.service.view().products.find((p) => p.id === c.productId);
    if (!p) throw new Error("SKU no encontrado.");
    let seed = c.seed;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const base = c.dailyDemand ?? p.dailyDemand;
    const series = Array.from({ length: c.days }, (_, i) =>
      Math.max(
        0,
        Math.round(
          base *
            (0.75 + rand() * 0.5) *
            (c.pattern === "weekly" ? (i % 7 >= 5 ? 1.6 : 0.76) : 1) *
            (c.pattern === "promotion" && i >= 28 && i < 35 ? 1.8 : 1),
        ),
      ),
    );
    const evaluations = series.slice(14).map((actual, j) => {
      const i = j + 14,
        prior = series.slice(Math.max(0, i - 14), i),
        prediction = prior.reduce((a, b) => a + b, 0) / prior.length;
      return { day: i, actual, prediction, baseline: base };
    });
    const mae = (key: "prediction" | "baseline") =>
      evaluations.reduce((n, e) => n + Math.abs(e.actual - e[key]), 0) /
      evaluations.length;
    const demand =
        (series.slice(-14).reduce((a, b) => a + b, 0) / 14) *
        (1 + c.uplift / 100),
      lead =
        p.leadDays +
        (c.pattern === "delay" ? Math.max(3, c.delayDays) : c.delayDays);
    const result = {
      simulation: true,
      config: c,
      assumptionDailyDemand: base,
      series,
      evaluations,
      maeHistory: mae("prediction"),
      maeCurrent: mae("baseline"),
      nextWeek: demand * 7,
      coverageDays: demand ? p.analysis.available / demand : null,
      shortageRisk: demand * lead > p.analysis.available,
      recommendedUnits: Math.max(
        0,
        Math.ceil(
          demand * (lead + p.reviewDays + p.safetyDays) - p.analysis.position,
        ),
      ),
      leadDays: lead,
    };
    if (save)
      this.db
        .prepare("INSERT INTO simulations VALUES (?,?,?)")
        .run(randomUUID(), JSON.stringify(result), iso(this.service.now()));
    return result;
  }
}
