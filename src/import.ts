import Papa from "papaparse";
import { productSchema, COFFEE_NAME, type Product } from "./domain.ts";
export const csvColumns = [
  "id",
  "name",
  "unit",
  "onHand",
  "reserved",
  "dailyDemand",
  "leadDays",
  "reviewDays",
  "safetyDays",
  "unitsPerPack",
  "minPacks",
  "maxStock",
  "budget",
  "supplier",
];
const numeric = csvColumns.filter(
  (k) => !["id", "name", "unit", "supplier"].includes(k),
);
export function previewCsv(csv: string) {
  if (csv.length > 200000) throw new Error("El CSV supera 200 KB.");
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  const errors: { row: number; message: string }[] = parsed.errors.map((e) => ({
    row: (e.row ?? 0) + 2,
    message: "Formato CSV inválido: revisa comillas y número de columnas.",
  }));
  const missing = csvColumns.filter((k) => !parsed.meta.fields?.includes(k));
  if (missing.length)
    errors.push({ row: 1, message: `Faltan columnas: ${missing.join(", ")}.` });
  if (!parsed.data.length || parsed.data.length > 1000)
    errors.push({ row: 1, message: "Se admiten de 1 a 1000 productos." });
  if (missing.length)
    return { products: [], errors, total: parsed.data.length };
  const products: Product[] = [];
  const ids = new Set<string>();
  for (const [i, row] of parsed.data.entries()) {
    const values: Record<string, unknown> = { ...row };
    for (const k of numeric) values[k] = row[k]?.trim() ? Number(row[k]) : NaN;
    const result = productSchema.safeParse(values);
    if (!result.success) {
      errors.push({
        row: i + 2,
        message: result.error.issues
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join("; "),
      });
      continue;
    }
    if (ids.has(result.data.id)) {
      errors.push({ row: i + 2, message: `SKU duplicado: ${result.data.id}.` });
      continue;
    }
    if (
      (result.data.supplier === "blendstation" ||
        result.data.id === "CAFE-250") &&
      (result.data.id !== "CAFE-250" ||
        result.data.supplier !== "blendstation" ||
        result.data.name !== COFFEE_NAME ||
        result.data.unitsPerPack !== 1 ||
        result.data.unit !== "bolsas")
    ) {
      errors.push({
        row: i + 2,
        message:
          "Blend Station solo está vinculado a CAFE-250, bolsas de 250 g, una bolsa por unidad de compra.",
      });
      continue;
    }
    ids.add(result.data.id);
    products.push(result.data);
  }
  return { products, errors, total: parsed.data.length };
}
