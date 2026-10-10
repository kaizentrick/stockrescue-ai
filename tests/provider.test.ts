import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeQuote, SandboxProvider } from "../src/provider.ts";
import { ReapSandboxAdapter } from "../src/reap.ts";
import { initialState } from "../src/domain.ts";
const base = {
  product: "Coffee",
  merchant: "Blend Station",
  variantId: "v",
  quantity: 4,
  inventoryQuantity: 4,
  unitsPerPack: 1,
  destination: initialState().settings.address,
  evidenceHash: "h",
  fixture: false,
};
test("provider accepts optional breakdown fields but requires authoritative total/currency", () => {
  const raw = {
    id: "q",
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    amountBreakdown: {
      itemsSubtotal: { amount: 1200, currency: "MXN" },
      finalAmount: { amount: 1200, currency: "MXN" },
      tax: { amount: { amount: 0, currency: "MXN" } },
    },
  };
  const q = normalizeQuote(raw, base);
  assert.equal(q.total, 120000);
  assert.equal(q.shipping, null);
  assert.equal(q.taxIncluded, null);
  assert.throws(() =>
    normalizeQuote(
      {
        ...raw,
        amountBreakdown: {
          ...raw.amountBreakdown,
          finalAmount: { amount: 1200, currency: "USD" },
        },
      },
      base,
    ),
  );
});
test("enrollment GET normalizes and validates hosted action exactly like POST", async () => {
  const adapter = new ReapSandboxAdapter(
    {
      mode: "payments",
      apiKey: "fixture",
      returnUrl: "https://example.test/return",
      allowedMerchantIds: ["blendstation.com.mx"],
      hostedActionHosts: ["sandbox.collect.prava.space"],
    },
    async () =>
      Response.json({
        id: "e",
        status: "REQUIRES_ACTION",
        nextAction: { url: "https://sandbox.collect.prava.space/?fixture=1" },
      }),
  );
  const provider = new SandboxProvider(adapter);
  assert.equal(
    (await provider.getEnrollment("e")).nextAction,
    "https://sandbox.collect.prava.space/?fixture=1",
  );
});

test("quantity/price mismatch blocks a quote instead of silently crediting units", () => {
  const raw = {
    id: "q",
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    amountBreakdown: {
      itemsSubtotal: { amount: 300, currency: "MXN" },
      finalAmount: { amount: 360, currency: "MXN" },
    },
  };
  assert.throws(
    () => normalizeQuote(raw, { ...base, verifiedUnitPrice: 30000 }),
    /QUANTITY_OR_PRICE_MISMATCH/,
  );
  const q = normalizeQuote(raw, {
    ...base,
    quantity: 1,
    inventoryQuantity: 1,
    verifiedUnitPrice: 30000,
  });
  assert.equal(q.quantity, 1);
  assert.equal(q.subtotal, 30000);
});

test("legacy or inconsistent sandbox snapshots fail before any checkout or refresh request", async () => {
  let calls = 0;
  const provider = new SandboxProvider(
    new ReapSandboxAdapter(
      {
        mode: "payments",
        apiKey: "fixture",
        returnUrl: "https://example.test",
        allowedMerchantIds: ["blendstation.com.mx"],
        hostedActionHosts: ["sandbox.collect.prava.space"],
      },
      async () => {
        calls++;
        return Response.json({});
      },
    ),
  );
  const legacy = normalizeQuote(
    {
      id: "old",
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      amountBreakdown: {
        itemsSubtotal: { amount: 1200, currency: "MXN" },
        finalAmount: { amount: 1200, currency: "MXN" },
      },
    },
    base,
  );
  await assert.rejects(provider.getQuote(legacy), /cantidad verificada/);
  await assert.rejects(
    provider.shipping(legacy, "ship", "key"),
    /cantidad verificada/,
  );
  assert.equal(calls, 0);
});
