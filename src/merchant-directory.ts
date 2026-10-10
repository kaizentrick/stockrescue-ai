/** StockRescue's product reference from the user's official merchant sheet.
 * This snapshot does not establish live stock, quantity, or API authorization.
 * Shopify variant IDs from the sheet are not Reap discovery variant IDs.
 */
export type MerchantReference = {
  domain: string;
  sourceRow: number;
  market: string;
  explicitlyShipsToMX: boolean;
  referenceProduct: string;
  sourceVariantId: string;
  sourceVariantKind: "SHOPIFY_VARIANT";
  referencePrice: { amount: string; currency: string };
  source: "official-sheet-excerpt";
  apiMerchantId: null;
  apiVariantId: null;
  stock: "UNVERIFIED";
  quote: "UNVERIFIED";
};
export const merchantSource = {
  url: "https://docs.google.com/spreadsheets/d/1pqb1Jlx1sycembPcjMZ4dxhwzVWXfK7k8RtfNMhb_cs/edit?gid=0#gid=0",
  sheet: "All Supported Merchants",
  range: "A1:I153",
  modifiedAt: "2026-10-05T14:01:46.615Z",
  readAt: "2026-10-10T00:56:00Z",
  totalMerchants: 152,
  snapshotPath: "docs/space/08-comercios-admitidos-fuente.json",
  provenance:
    "Reference extracted from the complete read-only sheet export stored in docs/space; prices and stock require a fresh Reap quote.",
} as const;
export const merchantReferences: MerchantReference[] = [
  {
    domain: "blendstation.com.mx",
    sourceRow: 20,
    market: "MX",
    explicitlyShipsToMX: true,
    referenceProduct:
      "Cafe Guerrero Atoyac Bourbon Tipica Natural Fermentado - 250 gr / Grano",
    sourceVariantId: "47607777984690",
    sourceVariantKind: "SHOPIFY_VARIANT",
    referencePrice: { amount: "300", currency: "MXN" },
    source: "official-sheet-excerpt",
    apiMerchantId: null,
    apiVariantId: null,
    stock: "UNVERIFIED",
    quote: "UNVERIFIED",
  },
];
/** Unknown and wildcard shipping values must never pass a destination filter. */
export function hasExplicitDestination(
  shippingCountries: string[],
  destination: string,
): boolean {
  return (
    /^[A-Z]{2}$/.test(destination) && shippingCountries.includes(destination)
  );
}
export function mexicoDiscoveryCandidates(): MerchantReference[] {
  return merchantReferences.filter((m) => m.explicitlyShipsToMX);
}
