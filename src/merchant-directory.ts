/** Official-sheet excerpts supplied by the user through verified read-only export.
 * These are discovery candidates, NOT an enabled API allowlist or live offers.
 */
export type MerchantReference = {
  domain: string;
  sourceRow: number;
  market: string;
  explicitlyShipsToMX: boolean;
  referenceProduct: string;
  sourceVariantId: string;
  referencePrice: { amount: string; currency: string };
  source: "official-sheet-excerpt";
  apiMerchantId: null;
  stock: "UNVERIFIED";
  compatibility: "UNVERIFIED";
};
export const merchantSource = {
  url: "https://docs.google.com/spreadsheets/d/1pqb1Jlx1sycembPcjMZ4dxhwzVWXfK7k8RtfNMhb_cs/edit?gid=0#gid=0",
  sheet: "All Supported Merchants",
  range: "A1:I153",
  modifiedAt: "2026-10-05T14:01:46Z",
  totalMerchants: 152,
  electronicsMerchants: 29,
  provenance:
    "Read-only connector verification reported in the user's delegated instructions; full export pending.",
} as const;
export const merchantReferences: MerchantReference[] = [
  {
    domain: "satechi.net",
    sourceRow: 118,
    market: "US",
    explicitlyShipsToMX: true,
    referenceProduct: "USB-C Snap Hub - Citrus",
    sourceVariantId: "44267709005912",
    referencePrice: { amount: "44.99", currency: "USD" },
    source: "official-sheet-excerpt",
    apiMerchantId: null,
    stock: "UNVERIFIED",
    compatibility: "UNVERIFIED",
  },
  {
    domain: "dockcase.com",
    sourceRow: 37,
    market: "HK",
    explicitlyShipsToMX: true,
    referenceProduct:
      "Dockcase Smart USB-C Hub 7-in-1 with M.2 SSD Enclosure - Black",
    sourceVariantId: "51181256933688",
    referencePrice: { amount: "109.99", currency: "USD" },
    source: "official-sheet-excerpt",
    apiMerchantId: null,
    stock: "UNVERIFIED",
    compatibility: "UNVERIFIED",
  },
  {
    domain: "anker.com.sg",
    sourceRow: 5,
    market: "SG",
    explicitlyShipsToMX: false,
    referenceProduct:
      "Anker Nano USB-C Hub 8-in-1 Dual Display 85W A210B - Silver",
    sourceVariantId: "52786047254813",
    referencePrice: { amount: "72.9", currency: "SGD" },
    source: "official-sheet-excerpt",
    apiMerchantId: null,
    stock: "UNVERIFIED",
    compatibility: "UNVERIFIED",
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
