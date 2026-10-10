import { z } from "zod";
import {
  cents,
  type Quote,
  type Proposal,
  type Settings,
  type Operation,
} from "./domain.ts";
import { ReapSandboxAdapter, type ReapCheckout } from "./reap.ts";
export interface Provider {
  mode: "LOCAL_SIMULATION" | "REAP_SANDBOX";
  quote(p: Proposal, settings: Settings, key: string): Promise<Quote>;
  getQuote(q: Quote): Promise<Quote>;
  shipping(q: Quote, id: string, key: string): Promise<Quote>;
  enroll(
    email: string,
    key: string,
    ownerReference?: string,
  ): Promise<{ id: string; status: string; nextAction?: string }>;
  getEnrollment(
    id: string,
  ): Promise<{ id: string; status: string; nextAction?: string }>;
  checkout(op: Operation): Promise<ReapCheckout>;
  lookup(op: Operation): Promise<ReapCheckout>;
  hosted(url: string): string;
}
const money = z.object({
  amount: z.union([z.number(), z.string()]),
  currency: z.string(),
});
const quoteResponse = z.object({
  id: z.string().min(1),
  expiresAt: z.string().datetime({ offset: true }),
  amountBreakdown: z.object({
    finalAmount: money,
    itemsSubtotal: money,
    shipping: money.optional(),
    tax: z
      .object({ amount: money, includedInPrices: z.boolean().optional() })
      .optional(),
    discounts: z.array(z.object({ amount: money })).optional(),
    additionalCharges: z.array(z.object({ amount: money })).optional(),
  }),
  shippingOptions: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        price: money,
        selected: z.boolean(),
      }),
    )
    .default([]),
});
export function normalizeQuote(
  raw: unknown,
  base: Omit<
    Quote,
    | "id"
    | "expiresAt"
    | "subtotal"
    | "shipping"
    | "tax"
    | "taxIncluded"
    | "discounts"
    | "additionalCharges"
    | "total"
    | "currency"
    | "shippingOptions"
  >,
): Quote {
  const parsed = quoteResponse.safeParse(raw);
  if (!parsed.success)
    throw new Error(
      "REAP_RESPONSE_INVALID: " +
        parsed.error.issues.map((x) => x.path.join(".")).join(", "),
    );
  const q = parsed.data,
    b = q.amountBreakdown;
  const read = (m: z.infer<typeof money>) => {
    if (m.currency !== "MXN")
      throw new Error(
        "La cotización debe estar en MXN. No se aplica una conversión estimada.",
      );
    return cents(m.amount);
  };
  if (
    base.verifiedUnitPrice !== undefined &&
    read(b.itemsSubtotal) !== base.verifiedUnitPrice * base.quantity
  )
    throw new Error(
      "QUANTITY_OR_PRICE_MISMATCH: el subtotal no coincide con la cantidad y precio unitario verificados. No se permite aprobar esta compra.",
    );
  return {
    ...base,
    id: q.id,
    expiresAt: q.expiresAt,
    subtotal: read(b.itemsSubtotal),
    shipping: b.shipping ? read(b.shipping) : null,
    tax: b.tax ? read(b.tax.amount) : null,
    taxIncluded: b.tax?.includedInPrices ?? null,
    discounts: (b.discounts ?? []).reduce((n, x) => n + read(x.amount), 0),
    additionalCharges: (b.additionalCharges ?? []).reduce(
      (n, x) => n + read(x.amount),
      0,
    ),
    total: read(b.finalAmount),
    currency: "MXN",
    shippingOptions: q.shippingOptions.map((o) => ({
      ...o,
      price: read(o.price),
    })),
  };
}
export class SandboxProvider implements Provider {
  mode = "REAP_SANDBOX" as const;
  adapter: ReapSandboxAdapter;
  constructor(adapter: ReapSandboxAdapter) {
    this.adapter = adapter;
  }
  async quote(p: Proposal, s: Settings, key: string) {
    const productId = "prd_77db2c922b12471b8f6588c3f2a9f135";
    const variantId = "var_576f1eddfa4a4ad18d6529b0199d61fe";
    const details = (await this.adapter.details(
      [productId],
      key + ":details",
    )) as {
      products?: {
        id: string;
        merchant?: { name: string };
        defaultVariant?: {
          id: string;
          name: string;
          available: boolean;
          price: { amount: number; currency: string };
        };
      }[];
    };
    const product = details.products?.find((x) => x.id === productId);
    const variant = product?.defaultVariant;
    if (
      product?.merchant?.name !== "Blend Station" ||
      !variant?.available ||
      variant.id !== variantId ||
      variant.name !== "250 gr / Grano" ||
      variant.price.currency !== "MXN"
    )
      throw new Error(
        "El proveedor no confirmó la bolsa de 250 g en grano. No se generó una compra.",
      );
    const verifiedUnitPrice = cents(variant.price.amount);
    const raw = await this.adapter.quote(
      {
        variantId,
        merchantId: "blendstation.com.mx",
        quantity: p.analysis.purchaseQuantity,
        email: s.email,
        shippingAddress: s.address,
      },
      key,
    );
    return normalizeQuote(raw, {
      product: p.product.name,
      merchant: "Blend Station",
      variantId,
      verifiedUnitPrice,
      source: "catalog",
      quantity: p.analysis.purchaseQuantity,
      inventoryQuantity: p.analysis.inventoryQuantity,
      unitsPerPack: p.product.unitsPerPack,
      destination: s.address,
      evidenceHash: p.evidenceHash,
      fixture: false,
    });
  }
  async getQuote(q: Quote) {
    assertSandboxQuote(q);
    return normalizeQuote(await this.adapter.getQuote(q.id), q);
  }
  async shipping(q: Quote, id: string, key: string) {
    assertSandboxQuote(q);
    return normalizeQuote(await this.adapter.shipping(q.id, id, key), q);
  }
  async enroll(
    email: string,
    key: string,
    ownerReference = "stockrescue-" + key,
  ) {
    const e = await this.adapter.enrollment({ id: ownerReference, email }, key);
    return {
      ...e,
      nextAction: e.nextAction?.url ? this.hosted(e.nextAction.url) : undefined,
    };
  }
  async getEnrollment(id: string) {
    const e = await this.adapter.getEnrollment(id);
    return {
      id: e.id,
      status: e.status,
      nextAction: e.nextAction?.url ? this.hosted(e.nextAction.url) : undefined,
    };
  }
  checkout(op: Operation) {
    assertSandboxQuote(op.quote);
    return this.adapter.checkout(op.quote.id, op.enrollmentId, op.key);
  }
  lookup(op: Operation) {
    if (!op.checkoutId)
      throw new Error("No hay identificador; recuperar con la misma clave.");
    return this.adapter.getCheckout(op.checkoutId);
  }
  hosted(url: string) {
    return this.adapter.hostedUrl(url);
  }
}

export function assertSandboxQuote(q: Quote) {
  if (
    q.source !== "catalog" ||
    q.variantId !== "var_576f1eddfa4a4ad18d6529b0199d61fe" ||
    !Number.isSafeInteger(q.verifiedUnitPrice) ||
    !q.verifiedUnitPrice ||
    q.verifiedUnitPrice < 0 ||
    !Number.isSafeInteger(q.quantity) ||
    q.quantity < 1 ||
    !Number.isSafeInteger(q.unitsPerPack) ||
    q.unitsPerPack < 1 ||
    q.subtotal !== q.verifiedUnitPrice * q.quantity ||
    q.inventoryQuantity !== q.quantity * q.unitsPerPack
  )
    throw new Error(
      "Cotización sin cantidad verificada. Obtén una cotización nueva.",
    );
}
