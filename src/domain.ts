import { createHash } from "node:crypto";
import { z } from "zod";
import { Decimal } from "decimal.js";
z.config(z.locales.es());
export const COFFEE_NAME = "Café Guerrero Atoyac · 250 g en grano";
export const productSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/),
    name: z.string().trim().min(2).max(120),
    unit: z.string().trim().min(1).max(24),
    onHand: z.number().int().min(0).max(1_000_000),
    reserved: z.number().int().min(0).max(1_000_000),
    dailyDemand: z.number().min(0).max(100_000),
    leadDays: z.number().int().min(1).max(365),
    reviewDays: z.number().int().min(1).max(90),
    safetyDays: z.number().int().min(0).max(90),
    unitsPerPack: z.number().int().min(1).max(100_000),
    minPacks: z.number().int().min(1).max(1000),
    maxStock: z.number().int().min(1).max(1_000_000),
    budget: z.number().int().min(0).max(10_000_000),
    supplier: z.enum(["blendstation", "none"]),
    revision: z.number().int().min(1).default(1),
  })
  .refine((p) => p.reserved <= p.onHand, {
    message: "Lo reservado no puede superar las existencias.",
    path: ["reserved"],
  });
export type Product = z.infer<typeof productSchema>;
export const addressSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/),
  addressLine1: z.string().trim().min(3).max(160),
  city: z.string().trim().min(2).max(80),
  region: z.string().trim().min(2).max(80),
  postalCode: z.string().regex(/^\d{5}$/),
  country: z.literal("MX"),
});
export type Address = z.infer<typeof addressSchema>;
export type Settings = {
  name: string;
  budget: number;
  email: string;
  address: Address;
  revision: number;
};
export type Analysis = {
  available: number;
  incoming: number;
  timelyIncoming: number;
  lateIncoming: number;
  position: number;
  coverageDays: number | null;
  reorderPoint: number;
  target: number;
  purchaseQuantity: number;
  inventoryQuantity: number;
  gapDays: number;
  status: "REORDER" | "ENOUGH" | "NO_DEMAND" | "INCOMING" | "CAPACITY";
  reason: string;
};
export type Money = { amount: number; currency: string };
export type Quote = {
  id: string;
  product: string;
  merchant: string;
  variantId: string;
  quantity: number;
  inventoryQuantity: number;
  unitsPerPack: number;
  verifiedUnitPrice?: number;
  source?: "catalog";
  subtotal: number;
  shipping: number | null;
  tax: number | null;
  taxIncluded: boolean | null;
  discounts: number;
  additionalCharges: number;
  total: number;
  currency: "MXN";
  expiresAt: string;
  shippingOptions: {
    id: string;
    name: string;
    price: number;
    selected: boolean;
  }[];
  destination: Address;
  evidenceHash: string;
  fixture: boolean;
};
export type Operation = {
  key: string;
  createdAt: string;
  checkoutId?: string;
  orderId?: string;
  status:
    | "PENDING"
    | "REQUIRES_ACTION"
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED"
    | "EXPIRED";
  quote: Quote;
  enrollmentId: string;
  note: string;
  nextAction?: string;
  finalAmount?: number;
  amountMismatch?: boolean;
};
export type Proposal = {
  id: string;
  productId: string;
  analysis: Analysis;
  product: Product;
  evidenceHash: string;
  state: "DRAFT" | "QUOTING" | "QUOTED" | "APPROVED" | "ORDERED" | "CANCELED";
  createdAt: string;
  quote?: Quote;
  approval?: { hash: string; at: string };
  operation?: Operation;
  request?: {
    key: string;
    kind: "quote" | "shipping";
    body: unknown;
    at: string;
  };
  error?: string;
  audit: { at: string; event: string; detail: string }[];
};
export type Incoming = {
  id: string;
  proposalId: string;
  productId: string;
  quantity: number;
  received: number;
  eta: string;
  orderId: string;
  createdAt: string;
  fixture: boolean;
};
export type State = {
  settings: Settings;
  products: Product[];
  proposals: Proposal[];
  incoming: Incoming[];
  receipts: { key: string; incomingId: string; quantity: number; at: string }[];
  enrollment?: {
    id?: string;
    key: string;
    status: string;
    nextAction?: string;
    createdAt: string;
    ownerEmail: string;
    ownerReference?: string;
  };
};
export const digest = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
export const evidenceHash = (
  p: Product,
  settings: Settings,
  incoming: Incoming[],
) =>
  digest({
    version: "stockrescue-minmax-1",
    p,
    settings,
    incoming: incoming
      .filter((x) => x.productId === p.id)
      .map((x) => ({
        id: x.id,
        quantity: x.quantity,
        received: x.received,
        eta: x.eta,
      })),
  });
export function cents(amount: number | string): number {
  const d = new Decimal(amount).times(100);
  if (
    !d.isFinite() ||
    !d.isInteger() ||
    d.isNegative() ||
    d.gt(Number.MAX_SAFE_INTEGER)
  )
    throw new Error("Importe inválido del proveedor.");
  return d.toNumber();
}
function projectedGap(
  available: number,
  demand: number,
  leadDays: number,
  open: Incoming[],
  now: number,
) {
  if (!demand) return 0;
  const end = now + leadDays * 86400000;
  let stock = available,
    at = now,
    gap = 0;
  for (const order of open
    .filter((i) => Date.parse(i.eta) >= now && Date.parse(i.eta) <= end)
    .sort((a, b) => Date.parse(a.eta) - Date.parse(b.eta))) {
    const days = (Date.parse(order.eta) - at) / 86400000;
    gap += Math.max(0, days - stock / demand);
    stock =
      Math.max(0, stock - days * demand) + order.quantity - order.received;
    at = Date.parse(order.eta);
  }
  return gap + Math.max(0, (end - at) / 86400000 - stock / demand);
}
export function analyze(
  p: Product,
  incoming: Incoming[],
  now = Date.now(),
): Analysis {
  productSchema.parse(p);
  const available = p.onHand - p.reserved,
    open = incoming.filter(
      (i) => i.productId === p.id && i.received < i.quantity,
    );
  const total = open.reduce((n, i) => n + i.quantity - i.received, 0);
  const timely = open
    .filter(
      (i) =>
        Date.parse(i.eta) >= now &&
        Date.parse(i.eta) <= now + p.leadDays * 86400000,
    )
    .reduce((n, i) => n + i.quantity - i.received, 0);
  const position = available + total,
    reorderPoint = new Decimal(p.dailyDemand)
      .mul(p.leadDays + p.safetyDays)
      .toNumber(),
    target = new Decimal(p.dailyDemand)
      .mul(p.leadDays + p.reviewDays + p.safetyDays)
      .ceil()
      .toNumber();
  const coverageDays = p.dailyDemand > 0 ? available / p.dailyDemand : null,
    gapDays = projectedGap(available, p.dailyDemand, p.leadDays, open, now);
  let purchaseQuantity =
    p.dailyDemand > 0 && position <= reorderPoint
      ? Math.max(
          p.minPacks,
          Math.ceil(Math.max(0, target - position) / p.unitsPerPack),
        )
      : 0;
  if (target <= position) purchaseQuantity = 0;
  let status: Analysis["status"] =
    p.dailyDemand === 0
      ? "NO_DEMAND"
      : purchaseQuantity
        ? "REORDER"
        : total
          ? "INCOMING"
          : "ENOUGH";
  if (
    purchaseQuantity &&
    p.onHand + total + purchaseQuantity * p.unitsPerPack > p.maxStock
  ) {
    status = "CAPACITY";
    purchaseQuantity = 0;
  }
  const reasons = {
    REORDER: `La posición de inventario (${position}) está en el punto de reposición (${reorderPoint}) o por debajo.`,
    ENOUGH:
      "La posición de inventario cubre el punto de reposición; no hace falta comprar.",
    NO_DEMAND: "Sin consumo registrado. No se genera una compra automática.",
    INCOMING:
      "Ya hay mercancía comprometida. Revisa su llegada antes de comprar más.",
    CAPACITY:
      "El empaque mínimo supera la capacidad disponible. Ajusta la capacidad o revisa al proveedor.",
  };
  return {
    available,
    incoming: total,
    timelyIncoming: timely,
    lateIncoming: total - timely,
    position,
    coverageDays,
    reorderPoint,
    target,
    purchaseQuantity,
    inventoryQuantity: purchaseQuantity * p.unitsPerPack,
    gapDays,
    status,
    reason: reasons[status],
  };
}
export function initialState(): State {
  const base = {
    unit: "bolsas",
    reserved: 0,
    leadDays: 3,
    reviewDays: 2,
    safetyDays: 1,
    unitsPerPack: 1,
    minPacks: 1,
    maxStock: 40,
    budget: 300000,
    revision: 1,
  };
  return {
    settings: {
      name: "Mi tienda · ejemplo",
      budget: 500000,
      email: "stockrescue@example.com",
      revision: 1,
      address: {
        firstName: "Demo",
        lastName: "StockRescue",
        phone: "+525555550100",
        addressLine1: "Luis G. Urbina 4",
        city: "Miguel Hidalgo",
        region: "Ciudad de México",
        postalCode: "11560",
        country: "MX",
      },
    },
    products: [
      {
        ...base,
        id: "CAFE-250",
        name: COFFEE_NAME,
        onHand: 2,
        dailyDemand: 0.5,
        supplier: "blendstation",
      },
      {
        ...base,
        id: "VASO-12",
        name: "Vasos de papel · paquete de 12",
        unit: "piezas",
        onHand: 72,
        dailyDemand: 6,
        unitsPerPack: 12,
        maxStock: 180,
        supplier: "none",
      },
      {
        ...base,
        id: "FILTRO-40",
        name: "Filtros para café · paquete de 40",
        unit: "piezas",
        onHand: 8,
        dailyDemand: 4,
        unitsPerPack: 40,
        maxStock: 120,
        supplier: "none",
      },
    ],
    proposals: [],
    incoming: [],
    receipts: [],
  };
}
