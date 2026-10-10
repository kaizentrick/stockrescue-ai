import { digest, evidenceHash } from "../domain.ts";
import type { Service } from "../service.ts";
import type { QuestionAnswerer } from "./gemini.ts";
import type { AgentStore } from "./store.ts";

export const money = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    n / 100,
  ) + " MXN";
const help =
  "StockRescue\n/inventario — existencias y reposición\n/pedidos — compras y recepción\n/reporte — resumen\n/cotizar SKU — preview con total\n/confirmar CODIGO — aprobar ese preview y enviar pedido (si está habilitado)\n/consultar ID — recuperar el mismo intento\nTambién puedes preguntar sobre el inventario en lenguaje natural.";

/** Narrow bridge: domain rules own all numbers and purchases; Gemini only answers. */
export class StockRescueAgent {
  service: Service;
  store: AgentStore;
  ai: QuestionAnswerer;
  allowCheckout: boolean;
  constructor(
    service: Service,
    store: AgentStore,
    ai: QuestionAnswerer,
    allowCheckout = false,
  ) {
    this.service = service;
    this.store = store;
    this.ai = ai;
    this.allowCheckout = allowCheckout;
  }
  context() {
    const s = this.service.view();
    return {
      mode: s.mode,
      currency: "MXN",
      serverTime: s.serverTime,
      budgetAvailable: money(s.budgetAvailable),
      budgetCommitted: money(s.budgetCommitted),
      products: s.products.slice(0, 100).map((p) => ({
        id: p.id,
        name: p.name,
        unit: p.unit,
        dailyDemand: p.dailyDemand,
        analysis: p.analysis,
      })),
      proposals: s.proposals.slice(0, 30).map((p) => ({
        id: p.id,
        productId: p.productId,
        state: p.state,
        quote:
          p.quote &&
          p.state !== "CANCELED" &&
          Date.parse(p.quote.expiresAt) > this.service.now() + 15000
            ? {
                quantity: p.quote.quantity,
                total: money(p.quote.total),
                expiresAt: p.quote.expiresAt,
              }
            : null,
        operation: p.operation
          ? {
              status: p.operation.status,
              orderId: p.operation.orderId,
              note: p.operation.note,
            }
          : null,
      })),
      incoming: s.incoming.slice(0, 30).map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        received: i.received,
        eta: i.eta,
      })),
    };
  }
  inventory() {
    return this.service
      .view()
      .products.map(
        (p) =>
          `${p.id} · ${p.name}\nDisponible: ${p.analysis.available} ${p.unit}; cobertura: ${p.analysis.coverageDays === null ? "sin consumo" : p.analysis.coverageDays.toFixed(1) + " días"}.\nReposición: ${p.analysis.purchaseQuantity} paquetes = ${p.analysis.inventoryQuantity} ${p.unit}. ${p.analysis.reason}`,
      )
      .join("\n\n");
  }
  orders() {
    const s = this.service.view();
    const orders = s.proposals
      .filter((p) => p.operation)
      .slice(0, 20)
      .map((p) => {
        const incoming = s.incoming.find((i) => i.proposalId === p.id);
        return `${p.id} · ${p.product.name}\n${p.operation!.status} · ${money(p.operation!.finalAmount ?? p.operation!.quote.total)}\n${incoming ? `Recibido: ${incoming.received}/${incoming.quantity} ${p.product.unit}.` : "Sin recepción registrada."}`;
      });
    return (
      orders.join("\n\n") ||
      "No hay pedidos enviados. Usa /cotizar SKU para revisar una reposición."
    );
  }
  async preview(sender: string, productId: string) {
    const product = this.service
      .view()
      .products.find((p) => p.id === productId);
    if (!product)
      return "Producto no encontrado. Revisa los SKU con /inventario.";
    if (product.supplier === "none")
      return `${productId}: se recomienda reponer ${product.analysis.inventoryQuantity} ${product.unit}, pero no hay un proveedor habilitado para cotizar. Configúralo en el SaaS antes de enviar un pedido.`;
    const p = this.service.create(productId);
    if (p.operation)
      return `Ya existe un intento ${p.id}. Usa /consultar ${p.id}.`;
    await this.service.quote(p.id);
    const current = this.service.view().proposals.find((x) => x.id === p.id)!;
    const q = current.quote;
    if (!q || current.state !== "QUOTED")
      throw new Error("No hay cotización vigente.");
    const token = this.store.confirmation({
      sender,
      proposalId: p.id,
      hash: digest(q),
      expiresAt: Date.parse(q.expiresAt) - 15000,
    });
    const mode =
      this.service.provider.mode === "LOCAL_SIMULATION"
        ? "Práctica local: pedido ficticio"
        : "Reap sandbox: pedido de prueba";
    return `${mode}\n${q.product}\nComprar: ${q.quantity} paquetes = ${q.inventoryQuantity} ${current.product.unit}.\nProveedor: ${q.merchant}\nProducto: ${money(q.subtotal)}\nEnvío: ${q.shipping === null ? "no desglosado" : money(q.shipping)}\nTotal: ${money(q.total)}\nDestino: ${q.destination.addressLine1}, ${q.destination.city}, CP ${q.destination.postalCode}\nVence: ${q.expiresAt}\nPropuesta: ${p.id}\nPara aprobar y enviar exactamente este preview: /confirmar ${token}\n${this.allowCheckout ? "La recepción se registra aparte en StockRescue." : "Envío deshabilitado en este entorno: AGENT_ALLOW_CHECKOUT=false."}`;
  }
  async confirm(sender: string, token: string) {
    const c = this.store.getConfirmation(token, sender);
    if (!c || c.expiresAt <= this.service.now())
      return "Código inválido o vencido. Solicita /cotizar SKU para revisar otro preview.";
    const p = this.service.view().proposals.find((x) => x.id === c.proposalId);
    if (!p?.quote || digest(p.quote) !== c.hash || p.state === "CANCELED")
      return "El inventario o la cotización cambió. Solicita /cotizar SKU y confirma el preview nuevo.";
    if (p.operation)
      return `Intento existente: ${p.id} · ${p.operation.status}. Usa /consultar ${p.id}; no se creó otro pedido.`;
    if (!this.allowCheckout)
      return "El entorno permite consultas y previews. El envío requiere AGENT_ALLOW_CHECKOUT=true y confirmación de un preview vigente.";
    if (this.service.view().enrollment?.status !== "ACTIVE")
      return "Vincula la tarjeta de prueba desde StockRescue y consulta su estado ACTIVE antes de confirmar. No se envió compra.";
    this.service.approve(p.id, c.hash);
    await this.service.checkout(p.id);
    const result = this.service.view().proposals.find((x) => x.id === p.id)!;
    return `Propuesta ${p.id}\n${result.operation?.status ?? result.state}\n${result.operation?.note ?? "Revisa el estado en StockRescue."}\nConsulta: /consultar ${p.id}\nExistencias sin cambios: la recepción se registra en el SaaS.`;
  }
  async reply(sender: string, message: string) {
    const text = message.trim();
    const [command, argument, ...extra] = text.split(/\s+/);
    const action = command.toLowerCase();
    if (
      extra.length &&
      ["/cotizar", "/confirmar", "/consultar"].includes(action)
    )
      return help;
    if (action === "/ayuda" || action === "/start") return help;
    if (action === "/inventario") return this.inventory();
    if (action === "/pedidos") return this.orders();
    if (action === "/reporte")
      return `${this.service.provider.mode}\nPresupuesto disponible: ${money(this.service.view().budgetAvailable)}\n\n${this.inventory()}\n\n${this.orders()}`;
    if (action === "/cotizar" && /^[A-Za-z0-9_-]{1,40}$/.test(argument ?? ""))
      return this.preview(sender, argument);
    if (action === "/confirmar" && /^[a-f0-9]{16}$/.test(argument ?? ""))
      return this.confirm(sender, argument);
    if (action === "/consultar" && /^[a-f0-9-]{36}$/.test(argument ?? "")) {
      const p = this.service.view().proposals.find((x) => x.id === argument);
      if (!p) return "Propuesta no encontrada.";
      if (p.operation) await this.service.reconcile(p.id);
      const updated = this.service.view().proposals.find((x) => x.id === p.id)!;
      return `${p.id} · ${updated.operation?.status ?? updated.state}\n${updated.operation?.note ?? "Todavía no se ha enviado un pedido."}`;
    }
    if (text.startsWith("/")) return help;
    return (
      (await this.ai.answer(text, this.context())) +
      "\n\nConsulta de solo lectura. Para enviar un pedido: /cotizar SKU y /confirmar CODIGO."
    );
  }
  alerts() {
    const s = this.service.view();
    return s.products
      .filter((p) => p.analysis.status === "REORDER")
      .map((p) => {
        const rawProduct = this.service.store
          .read()
          .products.find((x) => x.id === p.id)!;
        const proposal = s.proposals.find(
          (x) =>
            x.productId === p.id &&
            !x.operation &&
            x.state !== "CANCELED" &&
            x.quote &&
            Date.parse(x.quote.expiresAt) > this.service.now() + 15000 &&
            x.evidenceHash === evidenceHash(rawProduct, s.settings, s.incoming),
        );
        const total =
          (s.mode === "LOCAL_SIMULATION"
            ? "Práctica local: "
            : "Reap sandbox: ") +
          (proposal?.quote
            ? money(proposal.quote.total)
            : "sin cotización vigente");
        const parameters = [
          p.name,
          `${p.analysis.purchaseQuantity} paquetes = ${p.analysis.inventoryQuantity} ${p.unit}`,
          total,
          p.supplier === "none" ? "/inventario" : `/cotizar ${p.id}`,
        ];
        return {
          productId: p.id,
          parameters,
          fingerprint: digest({
            mode: s.mode,
            productId: p.id,
            revision: p.revision,
            quantity: p.analysis.purchaseQuantity,
            total,
          }),
        };
      });
  }
}
