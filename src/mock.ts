import { randomUUID } from "node:crypto";
import type { Provider } from "./provider.ts";
import type { Quote, Proposal, Settings, Operation } from "./domain.ts";
import type { ReapCheckout } from "./reap.ts";
import { Store } from "./store.ts";
export class MockAdapter implements Provider {
  mode = "LOCAL_SIMULATION" as const;
  store: Store;
  calls = 0;
  failAfterAcceptance = false;
  constructor(store: Store) {
    this.store = store;
  }
  async quote(p: Proposal, s: Settings): Promise<Quote> {
    const qty = p.analysis.purchaseQuantity;
    return {
      id: "mock_quote_" + randomUUID(),
      product: p.product.name,
      merchant: "Blend Station · precio de ejemplo",
      variantId: "47607777984690",
      quantity: qty,
      inventoryQuantity: p.analysis.inventoryQuantity,
      unitsPerPack: p.product.unitsPerPack,
      subtotal: qty * 30000,
      shipping: 9900,
      tax: 0,
      taxIncluded: true,
      discounts: 0,
      additionalCharges: 0,
      total: qty * 30000 + 9900,
      currency: "MXN",
      expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
      shippingOptions: [
        {
          id: "standard",
          name: "Estándar · ejemplo",
          price: 9900,
          selected: true,
        },
        {
          id: "express",
          name: "Express · ejemplo",
          price: 14900,
          selected: false,
        },
      ],
      destination: s.address,
      evidenceHash: p.evidenceHash,
      fixture: true,
    };
  }
  async getQuote(q: Quote) {
    return structuredClone(q);
  }
  async shipping(q: Quote, id: string) {
    const selected = q.shippingOptions.find((o) => o.id === id);
    if (!selected) throw new Error("Envío inválido.");
    return {
      ...q,
      shipping: selected.price,
      total: q.subtotal + selected.price,
      shippingOptions: q.shippingOptions.map((o) => ({
        ...o,
        selected: o.id === id,
      })),
    };
  }
  async enroll() {
    return { id: "mock_enrollment", status: "ACTIVE" };
  }
  async getEnrollment(id: string) {
    return { id, status: "ACTIVE" };
  }
  async checkout(op: Operation): Promise<ReapCheckout> {
    const prior = this.store.db
      .prepare("SELECT data FROM mock_orders WHERE key=?")
      .get(op.key) as { data: string } | undefined;
    if (prior) return JSON.parse(prior.data) as ReapCheckout;
    this.calls++;
    const result: ReapCheckout = {
      id: "mock_checkout_" + randomUUID(),
      status: "COMPLETED",
      quoteId: op.quote.id,
      enrollmentId: op.enrollmentId,
      orderId: "mock_order_" + randomUUID(),
      finalAmount: { amount: op.quote.total / 100, currency: "MXN" },
      nextAction: null,
    };
    this.store.db
      .prepare("INSERT INTO mock_orders VALUES (?,?)")
      .run(op.key, JSON.stringify(result));
    if (this.failAfterAcceptance) throw new Error("REAP_OUTCOME_UNKNOWN");
    return result;
  }
  async lookup(op: Operation) {
    return this.checkout(op);
  }
  hosted() {
    throw new Error("La práctica local no necesita redirección.");
    return "";
  }
}
