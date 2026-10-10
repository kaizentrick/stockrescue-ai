import { createHash, randomUUID } from "node:crypto";
import { diagnose, workplaces, type Case, type Quote } from "./domain.ts";
import { MockAdapter, type MockOutcome } from "./mock.ts";
import { Store } from "./store.ts";
export const snapshot = (q: Quote) =>
  createHash("sha256").update(JSON.stringify(q)).digest("hex");
export class Service {
  store: Store;
  adapter: MockAdapter;
  now: () => number;
  totalBudget: number;
  constructor(store: Store, now = Date.now, totalBudget = 100000) {
    this.store = store;
    this.adapter = new MockAdapter(store);
    this.now = now;
    this.totalBudget = totalBudget;
  }
  audit(c: Case, event: string, detail: string) {
    c.audit.push({ at: new Date(this.now()).toISOString(), event, detail });
  }
  create(
    workplaceId: string,
    scenario: "normal" | "unknown" = "normal",
    budget = 50000,
  ): Case {
    const source = workplaces.find((w) => w.id === workplaceId);
    if (!source) throw new Error("Puesto inválido.");
    if (
      !Number.isSafeInteger(budget) ||
      budget < 0 ||
      budget > this.totalBudget
    )
      throw new Error("Presupuesto inválido.");
    return this.store.transaction(() => {
      const existing = this.store
        .all()
        .find((c) => c.workplace.id === workplaceId && !c.canceled);
      if (existing) return existing;
      const workplace = structuredClone(source);
      if (scenario === "unknown")
        workplace.outputs = [
          { connector: "USB-C", protocol: "UNKNOWN", maxHz4k: 0 },
        ];
      const c: Case = {
        id: randomUUID(),
        workplace,
        scenario,
        budget,
        canceled: false,
        audit: [],
      };
      this.audit(
        c,
        "REPORTED",
        "Pantalla sin conexión. Fixture sintético; incidencia abierta.",
      );
      this.store.save(c);
      return c;
    });
  }
  change(id: string, fn: (c: Case) => void): Case {
    return this.store.transaction(() => {
      const c = this.store.get(id);
      fn(c);
      this.store.save(c);
      return c;
    });
  }
  diagnose(id: string) {
    return this.change(id, (c) => {
      if (c.operation || c.canceled)
        throw new Error("El expediente ya no admite cambios de diagnóstico.");
      c.diagnosis = diagnose(c.workplace);
      this.audit(c, "DIAGNOSED", c.diagnosis.title);
    });
  }
  quote(id: string) {
    return this.change(id, (c) => {
      if (c.operation || c.canceled)
        throw new Error(
          "No se puede recotizar un intento enviado o cancelado.",
        );
      if (c.diagnosis?.decision !== "BUY")
        throw new Error("El diagnóstico no autoriza buscar una compra.");
      if (c.quote) (c.quoteHistory ??= []).push(c.quote);
      c.quote = this.adapter.quote(c.workplace, this.now());
      c.approval = undefined;
      this.audit(
        c,
        "QUOTED",
        "Cotización final nueva; toda aprobación anterior queda invalidada.",
      );
    });
  }
  approve(id: string, hash: string) {
    return this.change(id, (c) => {
      if (c.operation || c.canceled)
        throw new Error("Este expediente no admite aprobación.");
      if (!c.quote || snapshot(c.quote) !== hash)
        throw new Error(
          "La cotización cambió. Revisa y aprueba el snapshot actual.",
        );
      if (Date.parse(c.quote.expiresAt) <= this.now())
        throw new Error("La cotización venció. Solicita otra.");
      if (c.quote.total > c.budget)
        throw new Error("El total excede el presupuesto del puesto.");
      c.approval = {
        hash,
        at: new Date(this.now()).toISOString(),
        by: "Responsable TI · sesión local",
      };
      (c.approvalHistory ??= []).push(c.approval);
      this.audit(
        c,
        "APPROVED",
        `Snapshot ${hash}; total ${c.quote.total} centavos MXN.`,
      );
    });
  }
  cancel(id: string) {
    return this.change(id, (c) => {
      if (c.operation)
        throw new Error(
          "Compra enviada: consulta el mismo intento; no se puede cancelar localmente.",
        );
      c.canceled = true;
      c.approval = undefined;
      this.audit(
        c,
        "CANCELED",
        "Cancelado antes de enviar compra. Sin cargo ni reserva.",
      );
    });
  }
  retry(id: string) {
    return this.change(id, (c) => {
      if (!c.operation || !["FAILED", "EXPIRED"].includes(c.operation.status))
        throw new Error(
          "Solo un fallo definitivo o expiración permite preparar otro intento.",
        );
      this.audit(
        c,
        "RETRY_PREPARED",
        `Intento anterior ${c.operation.key} finalizó ${c.operation.status}; nuevo diagnóstico, cotización y aprobación requeridos.`,
      );
      (c.attempts ??= []).push(c.operation);
      if (c.quote) (c.quoteHistory ??= []).push(c.quote);
      c.operation = undefined;
      c.quote = undefined;
      c.approval = undefined;
      c.diagnosis = diagnose(c.workplace);
    });
  }
  async checkout(
    id: string,
    outcome: MockOutcome = "completed",
  ): Promise<Case> {
    const claim = this.store.transaction(() => {
      const c = this.store.get(id);
      if (c.operation) return { c, send: false };
      if (
        c.canceled ||
        !c.quote ||
        !c.approval ||
        snapshot(c.quote) !== c.approval.hash
      )
        throw new Error("Hace falta aprobación válida para esta cotización.");
      if (Date.parse(c.quote.expiresAt) <= this.now())
        throw new Error("Cotización vencida: vuelve a cotizar y aprobar.");
      const committed = this.store
        .all()
        .reduce(
          (s, x) =>
            s +
            (x.operation &&
            ["PENDING", "COMPLETED"].includes(x.operation.status)
              ? x.operation.quote.total
              : 0),
          0,
        );
      if (
        c.quote.total > c.budget ||
        committed + c.quote.total > this.totalBudget
      )
        throw new Error(
          "Presupuesto disponible insuficiente. No se envió compra.",
        );
      c.operation = {
        key: randomUUID(),
        createdAt: new Date(this.now()).toISOString(),
        quote: structuredClone(c.quote),
        status: "PENDING",
        note: "Reserva atómica; esperando verificación del proveedor.",
      };
      this.audit(
        c,
        "RESERVED",
        `Reserva ${c.quote.total}; operación ${c.operation.key}.`,
      );
      this.store.save(c);
      return { c, send: true };
    });
    if (!claim.send) return claim.c;
    try {
      const result = await this.adapter.checkout(claim.c.operation!, outcome);
      return this.change(id, (c) => {
        c.operation = result;
        this.audit(c, "CHECKOUT_" + result.status, result.note);
      });
    } catch {
      return this.change(id, (c) => {
        if (c.operation?.status === "PENDING") {
          c.operation.note =
            "Timeout: estado pendiente de verificación. Consulta el mismo intento; reserva conservada.";
          this.audit(c, "PENDING", c.operation.note);
        }
      });
    }
  }
  reconcile(id: string) {
    return this.change(id, (c) => {
      if (!c.operation) throw new Error("No hay intento para consultar.");
      if (c.operation.status !== "PENDING") return;
      const result = this.adapter.lookup(c.operation.key);
      if (result) {
        c.operation = result;
        this.audit(c, "RECONCILED", result.note);
      } else
        this.audit(
          c,
          "PENDING",
          "Sin resultado verificable. Se conserva la reserva; no se crea otra compra.",
        );
    });
  }
  view(c: Case) {
    const quoteValid = !!c.quote && Date.parse(c.quote.expiresAt) > this.now();
    return {
      ...c,
      quoteHash: c.quote ? snapshot(c.quote) : undefined,
      approvalValid:
        quoteValid && !!c.approval && c.approval.hash === snapshot(c.quote!),
      incidentStatus: "OPEN_INSTALLATION_PENDING",
      mode: "LOCAL_SIMULATION",
    };
  }
}
