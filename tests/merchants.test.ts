import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hasExplicitDestination,
  mexicoDiscoveryCandidates,
  merchantReferences,
} from "../src/merchant-directory.ts";
test("official sheet references remain candidates, not stock, quote or compatibility claims", () => {
  assert.deepEqual(
    mexicoDiscoveryCandidates().map((m) => m.domain),
    ["satechi.net", "dockcase.com"],
  );
  for (const row of merchantReferences) {
    assert.equal(typeof row.sourceVariantId, "string");
    assert.equal(row.apiMerchantId, null);
    assert.equal(row.stock, "UNVERIFIED");
    assert.equal(row.compatibility, "UNVERIFIED");
  }
  assert.equal(
    merchantReferences.find((m) => m.domain === "anker.com.sg")
      ?.explicitlyShipsToMX,
    false,
  );
});
test("unknown and wildcard do not imply universal shipping", () => {
  assert.equal(hasExplicitDestination(["*"], "MX"), false);
  assert.equal(hasExplicitDestination(["Unknown"], "MX"), false);
  assert.equal(hasExplicitDestination(["MY", "SG"], "MX"), false);
  assert.equal(hasExplicitDestination(["MX", "US"], "MX"), true);
});
