import { assertSandboxQuote } from "./provider.ts";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Store } from "./store.ts";
import { MockAdapter } from "./mock.ts";
import type { Provider } from "./provider.ts";
import {
  addressSchema,
  COFFEE_NAME,
  analyze,
  cents,
  digest,
  evidenceHash,
  productSchema,
  type State,
  type Proposal,
  type Operation,
} from "./domain.ts";
import { previewCsv } from "./import.ts";
import type { ReapCheckout } from "./reap.ts";
export const snapshot = digest;
const settingsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  budget: z.number().int().min(0).max(10_000_000),
  email: z.email(),
  address: addressSchema,
});
const terminal = (p: Proposal) =>
  p.state === "CANCELED" ||
  (p.operation && ["FAILED", "EXPIRED"].includes(p.operation.status));
const active = (p: Proposal) =>
  p.operation &&
  !["FAILED", "EXPIRED", "COMPLETED"].includes(p.operation.status);
export class Service {
  store: Store;
  provider: Provider;
  now: () => number;
  private locks = new Set<string>();
  constructor(store: Store, provider?: Provider, now = Date.now) {
    this.store = store;
    this.provider = provider ?? new MockAdapter(store);
    this.now = now;
  }
  audit(p: Proposal, event: string, detail: string) {
    p.audit.push({ at: new Date(this.now()).toISOString(), event, detail });
  }
  find(s: State, id: string) {
    const p = s.proposals.find((x) => x.id === id);
    if (!p) throw new Error("Reposición no encontrada.");
    return p;
  }
  committed(s: State) {
    return s.proposals.reduce(
      (n, p) =>
        n +
        (p.operation && !["FAILED", "EXPIRED"].includes(p.operation.status)
          ? Math.max(p.operation.quote.total, p.operation.finalAmount ?? 0)
          : 0),
      0,
    );
  }
  validEvidence(s: State, p: Proposal) {
    const product = s.products.find((x) => x.id === p.productId);
    if (
      !product ||
      evidenceHash(product, s.settings, s.incoming) !== p.evidenceHash
    )
      throw new Error(
        "El inventario o el destino cambió. Prepara una nueva reposición.",
      );
  }
  invalidate(s: State, productId?: string) {
    for (const p of s.proposals)
      if (!p.operation && (!productId || p.productId === productId)) {
        p.state = "CANCELED";
        p.approval = undefined;
        this.audit(
          p,
          "INVALIDATED",
          "Datos actualizados. La propuesta anterior ya no autoriza compras.",
        );
      }
  }
  view() {
    const s = this.store.read();
    return {
      ...s,
      mode: this.provider.mode,
      serverTime: new Date(this.now()).toISOString(),
      budgetCommitted: this.committed(s),
      budgetAvailable: s.settings.budget - this.committed(s),
      products: s.products.map((p) => ({
        ...p,
        analysis: analyze(p, s.incoming, this.now()),
      })),
      proposals: s.proposals.map((p) => ({
        ...p,
        quoteHash: p.quote ? digest(p.quote) : undefined,
        approvalValid:
          !!p.quote &&
          !!p.approval &&
          p.approval.hash === digest(p.quote) &&
          Date.parse(p.quote.expiresAt) > this.now() + 15000,
      })),
      enrollment: s.enrollment
        ? {
            id: s.enrollment.id,
            status: s.enrollment.status,
            nextAction: s.enrollment.nextAction,
          }
        : undefined,
    };
  }
  editProduct(id: string, values: unknown) {
    return this.store.transaction((s) => {
      const idx = s.products.findIndex((p) => p.id === id);
      if (idx < 0) throw new Error("Producto no encontrado.");
      const old = s.products[idx];
      const p = productSchema.parse({
        ...old,
        ...(values as object),
        id,
        revision: old.revision + 1,
      });
      if (
        (p.supplier === "blendstation" || p.id === "CAFE-250") &&
        (p.id !== "CAFE-250" ||
          p.supplier !== "blendstation" ||
          p.unitsPerPack !== 1 ||
          p.unit !== "bolsas" ||
          p.name !== COFFEE_NAME)
      )
        throw new Error(
          "El café está vinculado a una bolsa de 250 g; conserva su identidad y unidad.",
        );
      if (s.proposals.some((x) => x.productId === id && active(x)))
        throw new Error(
          "Consulta la compra pendiente antes de editar este producto.",
        );
      if (
        s.incoming.some((i) => i.productId === id && i.received < i.quantity) &&
        (p.name !== old.name ||
          p.unit !== old.unit ||
          p.unitsPerPack !== old.unitsPerPack ||
          p.supplier !== old.supplier)
      )
        throw new Error(
          "Conserva la identidad y unidad mientras hay mercancía por recibir.",
        );
      s.products[idx] = p;
      this.invalidate(s, id);
      return p;
    });
  }
  settings(values: unknown) {
    const next = settingsSchema.parse(values);
    return this.store.transaction((s) => {
      if (s.proposals.some(active))
        throw new Error(
          "Hay una compra pendiente. Consulta su resultado antes de cambiar la tienda.",
        );
      if (next.budget < this.committed(s))
        throw new Error(
          "El presupuesto no puede ser menor que lo comprometido.",
        );
      if (s.enrollment && s.settings.email !== next.email)
        throw new Error("El correo del titular ya está vinculado al sandbox.");
      s.settings = { ...next, revision: s.settings.revision + 1 };
      this.invalidate(s);
    });
  }
  import(csv: string) {
    const preview = previewCsv(csv);
    if (preview.errors.length)
      throw new Error("Corrige todas las filas antes de importar.");
    return this.store.transaction((s) => {
      if (s.proposals.some(active))
        throw new Error("Consulta primero las compras pendientes.");
      for (const p of preview.products) {
        const old = s.products.find((x) => x.id === p.id);
        if (old) {
          if (
            old.supplier === "blendstation" &&
            (p.name !== COFFEE_NAME ||
              p.unit !== old.unit ||
              p.unitsPerPack !== old.unitsPerPack ||
              p.supplier !== old.supplier)
          )
            throw new Error(
              "La importación no puede cambiar la identidad del café vinculado.",
            );
          if (
            s.incoming.some(
              (i) => i.productId === p.id && i.received < i.quantity,
            ) &&
            (p.name !== old.name ||
              p.unit !== old.unit ||
              p.unitsPerPack !== old.unitsPerPack ||
              p.supplier !== old.supplier)
          )
            throw new Error(
              "No se pueden cambiar unidades de mercancía por recibir.",
            );
          p.revision = old.revision + 1;
          s.products[s.products.indexOf(old)] = p;
        } else s.products.push(p);
        this.invalidate(s, p.id);
      }
      return { count: preview.products.length };
    });
  }
  create(productId: string) {
    return this.store.transaction((s) => {
      const old = s.proposals.find(
        (p) =>
          p.productId === productId &&
          !terminal(p) &&
          (!p.operation || p.operation.status !== "COMPLETED"),
      );
      if (old) return old;
      const product = s.products.find((p) => p.id === productId);
      if (!product) throw new Error("Producto no encontrado.");
      const analysis = analyze(product, s.incoming, this.now());
      if (analysis.status !== "REORDER") throw new Error(analysis.reason);
      if (product.supplier !== "blendstation")
        throw new Error(
          "Este producto no tiene un proveedor habilitado. Puedes revisar su necesidad, pero no comprarlo.",
        );
      const p: Proposal = {
        id: randomUUID(),
        productId,
        product: structuredClone(product),
        analysis,
        evidenceHash: evidenceHash(product, s.settings, s.incoming),
        state: "DRAFT",
        createdAt: new Date(this.now()).toISOString(),
        audit: [],
      };
      this.audit(
        p,
        "PLANNED",
        `Reponer ${analysis.purchaseQuantity} unidades de compra = ${analysis.inventoryQuantity} ${product.unit}.`,
      );
      s.proposals.unshift(p);
      return p;
    });
  }
  async enroll(renew = false) {
    if (this.locks.has("enroll"))
      throw new Error("La vinculación está en curso. Consulta su estado.");
    this.locks.add("enroll");
    try {
      if (renew) {
        const previous = this.store.read().enrollment;
        if (previous?.id) {
          const current = await this.provider.getEnrollment(previous.id);
          if (current.status === "ACTIVE") renew = false;
        }
      }
      const e = this.store.transaction((s) => {
        if (
          (renew && s.enrollment?.status !== "ACTIVE") ||
          !s.enrollment ||
          ["FAILED", "EXPIRED", "REVOKED"].includes(s.enrollment.status)
        )
          s.enrollment = {
            ownerReference:
              s.enrollment?.ownerReference ?? "stockrescue-" + randomUUID(),
            key: randomUUID(),
            status: "PENDING",
            createdAt: new Date(this.now()).toISOString(),
            ownerEmail: s.settings.email,
          };
        return structuredClone(s.enrollment);
      });
      if (this.now() - Date.parse(e.createdAt) >= 86400000 && !e.id)
        throw new Error(
          "La solicitud tiene más de 24 horas. Requiere revisión con Reap.",
        );
      const result = e.id
        ? await this.provider.getEnrollment(e.id)
        : await this.provider.enroll(e.ownerEmail, e.key, e.ownerReference);
      this.store.transaction((s) => {
        if (s.enrollment?.key === e.key) {
          s.enrollment = {
            ...e,
            ...result,
            nextAction:
              result.status === "ACTIVE"
                ? undefined
                : (result.nextAction ?? e.nextAction),
          };
        }
      });
      return this.view();
    } finally {
      this.locks.delete("enroll");
    }
  }
  async quote(id: string, shippingId?: string) {
    if (this.locks.has(id))
      throw new Error("La cotización está en curso. Espera su resultado.");
    this.locks.add(id);
    try {
      const claim = this.store.transaction((s) => {
        const p = this.find(s, id);
        if (p.operation || p.state === "CANCELED")
          throw new Error("La reposición no admite otra cotización.");
        this.validEvidence(s, p);
        if (
          shippingId &&
          !p.quote?.shippingOptions.some((x) => x.id === shippingId)
        )
          throw new Error("Selecciona un envío disponible.");
        const desired = {
          settings: structuredClone(s.settings),
          shippingId: shippingId ?? null,
        };
        if (p.request && p.state === "QUOTING") {
          if (digest(p.request.body) !== digest(desired))
            throw new Error(
              "Recupera primero la cotización pendiente con la misma selección.",
            );
          if (this.now() - Date.parse(p.request.at) >= 86400000)
            throw new Error(
              "Cotización incierta de más de 24 horas; requiere revisión.",
            );
        } else
          p.request = {
            key: randomUUID(),
            kind: shippingId ? "shipping" : "quote",
            body: desired,
            at: new Date(this.now()).toISOString(),
          };
        p.state = "QUOTING";
        p.approval = undefined;
        p.error = undefined;
        this.audit(
          p,
          "QUOTE_REQUESTED",
          "Solicitud guardada; cotizando el total final.",
        );
        return { p: structuredClone(p), settings: structuredClone(s.settings) };
      });
      try {
        const q = shippingId
          ? await this.provider.shipping(
              claim.p.quote!,
              shippingId,
              claim.p.request!.key,
            )
          : await this.provider.quote(
              claim.p,
              claim.settings,
              claim.p.request!.key,
            );
        this.store.transaction((s) => {
          const p = this.find(s, id);
          if (
            p.state !== "QUOTING" ||
            p.operation ||
            p.request?.key !== claim.p.request?.key
          )
            return;
          this.validEvidence(s, p);
          p.quote = q;
          p.state = "QUOTED";
          p.request = undefined;
          this.audit(
            p,
            "QUOTED",
            `Total final ${q.total} centavos ${q.currency}.`,
          );
        });
      } catch (e) {
        const msg = this.safe(e);
        this.store.transaction((s) => {
          const p = this.find(s, id);
          if (
            p.state !== "QUOTING" ||
            p.operation ||
            p.request?.key !== claim.p.request?.key
          )
            return;
          p.error = msg;
          if (!/UNKNOWN|HTTP_5|HTTP_429|IN_PROGRESS/.test(msg)) {
            p.state = "DRAFT";
            p.request = undefined;
          }
          this.audit(p, "QUOTE_ERROR", msg);
        });
        throw e;
      }
      return this.view();
    } finally {
      this.locks.delete(id);
    }
  }
  approve(id: string, hash: string) {
    return this.store.transaction((s) => {
      const p = this.find(s, id);
      if (p.operation || p.state !== "QUOTED" || !p.quote)
        throw new Error("Obtén primero una cotización final.");
      this.validEvidence(s, p);
      if (hash !== digest(p.quote))
        throw new Error("La cotización cambió. Revisa el total actual.");
      this.checkQuote(p, s);
      p.approval = { hash, at: new Date(this.now()).toISOString() };
      p.state = "APPROVED";
      this.audit(
        p,
        "APPROVED",
        `Total aprobado: ${p.quote.total} centavos MXN.`,
      );
    });
  }
  checkQuote(p: Proposal, s: State) {
    if (p.quote && this.provider.mode === "REAP_SANDBOX")
      assertSandboxQuote(p.quote);
    if (!p.quote || Date.parse(p.quote.expiresAt) <= this.now() + 15000)
      throw new Error(
        "La cotización venció o está por vencer. Vuelve a cotizar.",
      );
    if (
      p.quote.total > p.product.budget ||
      p.quote.total + this.committed(s) > s.settings.budget
    )
      throw new Error(
        "El total supera el presupuesto disponible. No se enviará la compra.",
      );
    if (
      p.quote.currency !== "MXN" ||
      p.quote.quantity !== p.analysis.purchaseQuantity
    )
      throw new Error("La cotización no coincide con la reposición.");
  }
  cancel(id: string) {
    return this.store.transaction((s) => {
      const p = this.find(s, id);
      if (p.operation && !["FAILED", "EXPIRED"].includes(p.operation.status))
        throw new Error(
          "La compra fue enviada. Consulta su resultado; no se cancela localmente.",
        );
      p.state = "CANCELED";
      p.approval = undefined;
      this.audit(p, "CANCELED", "Propuesta cancelada.");
    });
  }
  async checkout(id: string) {
    if (this.locks.has(id)) return this.view();
    this.locks.add(id);
    try {
      const initial = this.find(this.store.read(), id);
      if (initial.operation) return this.view();
      if (!initial.quote || !initial.approval)
        throw new Error("Aprueba primero la cotización.");
      const fresh = await this.provider.getQuote(initial.quote);
      if (digest(fresh) !== initial.approval.hash) {
        this.store.transaction((s) => {
          const p = this.find(s, id);
          if (
            p.operation ||
            p.state === "CANCELED" ||
            p.approval?.hash !== initial.approval?.hash
          )
            return;
          p.quote = fresh;
          p.approval = undefined;
          p.state = "QUOTED";
          this.audit(
            p,
            "PRICE_CHANGED",
            "La cotización cambió; es necesaria una nueva aprobación.",
          );
        });
        throw new Error(
          "El precio o envío cambió. Revisa y aprueba el nuevo total.",
        );
      }
      const claim = this.store.transaction((s) => {
        const p = this.find(s, id);
        if (p.operation) return null;
        if (
          s.proposals.some(
            (other) =>
              other.id !== p.id &&
              other.productId === p.productId &&
              active(other),
          )
        )
          throw new Error(
            "Ya existe una compra pendiente para este producto. Consulta el mismo intento.",
          );
        this.validEvidence(s, p);
        if (p.state !== "APPROVED" || p.approval?.hash !== digest(fresh))
          throw new Error("La aprobación ya no es válida.");
        this.checkQuote(p, s);
        if (s.enrollment?.status !== "ACTIVE" || !s.enrollment.id)
          throw new Error("Vincula primero la tarjeta de prueba en Reap.");
        p.operation = {
          key: randomUUID(),
          createdAt: new Date(this.now()).toISOString(),
          quote: structuredClone(fresh),
          enrollmentId: s.enrollment.id,
          status: "PENDING",
          note: "Reserva guardada. Esperando respuesta de Reap.",
        };
        this.audit(p, "RESERVED", `Reservados ${fresh.total} centavos MXN.`);
        return structuredClone(p.operation);
      });
      if (claim) await this.sendAndConfirm(id, claim);
      return this.view();
    } finally {
      this.locks.delete(id);
    }
  }
  async sendAndConfirm(id: string, op: Operation) {
    try {
      const result = await this.provider.checkout(op);
      this.record(id, op, result, false);
      const saved = this.find(this.store.read(), id).operation!;
      if (saved.checkoutId) {
        const confirmed = await this.provider.lookup(saved);
        this.record(id, saved, confirmed, true);
      }
    } catch (e) {
      const message = this.safe(e);
      this.store.transaction((s) => {
        const p = this.find(s, id);
        if (
          p.operation?.key !== op.key ||
          ["COMPLETED", "FAILED", "EXPIRED"].includes(p.operation.status)
        )
          return;
        p.operation.note =
          message + " Consulta el mismo intento; la reserva se conserva.";
        this.audit(p, "PENDING", p.operation.note);
      });
    }
  }
  record(id: string, op: Operation, result: ReapCheckout, verified: boolean) {
    if (
      typeof result.id !== "string" ||
      !result.id ||
      (result.quoteId !== undefined && result.quoteId !== op.quote.id) ||
      (result.enrollmentId !== undefined &&
        result.enrollmentId !== op.enrollmentId) ||
      (verified && result.id !== op.checkoutId) ||
      ![
        "REQUIRES_ACTION",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
        "EXPIRED",
      ].includes(result.status)
    )
      throw new Error("Respuesta de checkout no verificable.");
    const next = result.nextAction?.url
      ? this.provider.hosted(result.nextAction.url)
      : undefined;
    if (
      verified &&
      result.status === "COMPLETED" &&
      (!result.orderId ||
        !result.finalAmount ||
        result.finalAmount.currency !== "MXN")
    )
      throw new Error("Pedido sin comprobante final verificable.");
    this.store.transaction((s) => {
      const p = this.find(s, id);
      if (
        p.operation?.key !== op.key ||
        ["COMPLETED", "FAILED", "EXPIRED"].includes(p.operation.status)
      )
        return;
      const status =
        result.status === "COMPLETED" && !verified
          ? "PROCESSING"
          : result.status;
      p.operation = {
        ...p.operation,
        checkoutId: result.id,
        status,
        nextAction: next,
        note:
          status === "COMPLETED"
            ? this.provider.mode === "REAP_SANDBOX"
              ? "Pedido confirmado en sandbox. Pendiente de recibir."
              : "Pedido confirmado en práctica local. Pendiente de recibir."
            : status === "REQUIRES_ACTION"
              ? "Completa la aprobación alojada de Reap y consulta el pedido."
              : status === "FAILED" || status === "EXPIRED"
                ? "El intento terminó sin confirmación de compra. Puedes preparar otra reposición."
                : "Compra enviada; consulta su resultado.",
      };
      if (verified && status === "COMPLETED") {
        const amount = cents(result.finalAmount!.amount);
        p.operation.finalAmount = amount;
        p.operation.orderId = result.orderId;
        p.operation.amountMismatch = amount !== op.quote.total;
        if (p.operation.amountMismatch)
          p.operation.note =
            "Pedido confirmado con importe distinto al aprobado. Revisión necesaria.";
        p.state = "ORDERED";
        if (!s.incoming.some((i) => i.proposalId === id))
          s.incoming.push({
            id: randomUUID(),
            proposalId: id,
            productId: p.productId,
            quantity: op.quote.inventoryQuantity,
            received: 0,
            eta: new Date(
              this.now() + p.product.leadDays * 86400000,
            ).toISOString(),
            orderId: result.orderId!,
            createdAt: new Date(this.now()).toISOString(),
            fixture: this.provider.mode === "LOCAL_SIMULATION",
          });
      }
      this.audit(p, "CHECKOUT_" + status, p.operation.note);
    });
  }
  async reconcile(id: string) {
    if (this.locks.has(id)) return this.view();
    this.locks.add(id);
    try {
      const p = this.find(this.store.read(), id),
        op = p.operation;
      if (!op) throw new Error("No hay compra enviada.");
      if (["COMPLETED", "FAILED", "EXPIRED"].includes(op.status))
        return this.view();
      if (op.checkoutId) {
        const result = await this.provider.lookup(op);
        this.record(id, op, result, true);
      } else {
        if (this.now() - Date.parse(op.createdAt) >= 86400000)
          throw new Error(
            "La clave superó 24 horas. Requiere revisión con Reap; no se enviará otra compra.",
          );
        await this.sendAndConfirm(id, op);
      }
      return this.view();
    } finally {
      this.locks.delete(id);
    }
  }
  receive(id: string, quantity: number, key: string) {
    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      !z.uuid().safeParse(key).success
    )
      throw new Error("Cantidad o identificador de recepción inválido.");
    return this.store.transaction((s) => {
      const previous = s.receipts.find((r) => r.key === key);
      if (previous) {
        if (previous.incomingId !== id || previous.quantity !== quantity)
          throw new Error("La recepción ya existe con otros datos.");
        return;
      }
      const incoming = s.incoming.find((i) => i.id === id);
      if (!incoming || quantity > incoming.quantity - incoming.received)
        throw new Error("La cantidad supera lo pendiente de recibir.");
      const product = s.products.find((p) => p.id === incoming.productId)!;
      if (product.onHand + quantity > product.maxStock)
        throw new Error(
          "La recepción supera la capacidad; revisa el inventario.",
        );
      product.onHand += quantity;
      product.revision++;
      incoming.received += quantity;
      s.receipts.push({
        key,
        incomingId: id,
        quantity,
        at: new Date(this.now()).toISOString(),
      });
      this.invalidate(s, product.id);
      this.audit(
        this.find(s, incoming.proposalId),
        "RECEIVED",
        `${quantity} ${product.unit} recibidas. Pendiente: ${incoming.quantity - incoming.received}.`,
      );
    });
  }
  safe(e: unknown) {
    if (e instanceof z.ZodError)
      return e.issues
        .map((x) => `${x.path.join(".")}: ${x.message}`)
        .join("; ");
    return e instanceof Error
      ? e.message
      : "No se pudo completar la operación.";
  }
}
