import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  hasExplicitDestination,
  mexicoDiscoveryCandidates,
  merchantReferences,
  merchantSource,
} from "../src/merchant-directory.ts";
test("StockRescue sheet reference does not claim Reap IDs, live stock or a verified quote", () => {
  assert.deepEqual(
    mexicoDiscoveryCandidates().map((m) => m.domain),
    ["blendstation.com.mx"],
  );
  for (const row of merchantReferences) {
    assert.equal(typeof row.sourceVariantId, "string");
    assert.equal(row.sourceVariantKind, "SHOPIFY_VARIANT");
    assert.equal(row.apiMerchantId, null);
    assert.equal(row.apiVariantId, null);
    assert.equal(row.stock, "UNVERIFIED");
    assert.equal(row.quote, "UNVERIFIED");
  }
});
test("coffee identity, destination and reference price match row 20 of the archived official sheet", () => {
  const source = JSON.parse(
    readFileSync(new URL("../" + merchantSource.snapshotPath, import.meta.url), "utf8"),
  ) as { records: Record<string, string | number>[] };
  const row = source.records.find((r) => r.sourceRow === 20)!;
  assert.ok(row);
  const coffee = merchantReferences[0];
  assert.equal(coffee.sourceRow, row.sourceRow);
  assert.equal(coffee.domain, row["Merchant door"]);
  assert.equal(coffee.referenceProduct, row["Test product"]);
  assert.equal(coffee.sourceVariantId, row["Variant ID"]);
  assert.equal(coffee.referencePrice.amount, row["Item price"]);
  assert.equal(coffee.referencePrice.currency, row.Currency);
  assert.equal(coffee.market, row.Market);
  assert.equal(row["Ships to"], "MX");
  assert.equal(source.records.length, merchantSource.totalMerchants);
});
test("unknown and wildcard do not imply universal shipping", () => {
  assert.equal(hasExplicitDestination(["*"], "MX"), false);
  assert.equal(hasExplicitDestination(["Unknown"], "MX"), false);
  assert.equal(hasExplicitDestination(["MY", "SG"], "MX"), false);
  assert.equal(hasExplicitDestination(["MX", "US"], "MX"), true);
});
