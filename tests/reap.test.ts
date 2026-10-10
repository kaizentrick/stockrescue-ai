import { test } from "node:test";
import assert from "node:assert/strict";
import { ReapSandboxAdapter } from "../src/reap.ts";
const config = {
  apiKey: "unit-test-placeholder",
  returnUrl: "https://demo.example/return",
  allowedMerchantIds: ["verified-fixture-id"],
  hostedActionHosts: ["hosted.example"],
};
test("Reap transport uses sandbox, version, persisted key, COMPLETED only, checks ACTIVE", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const transport: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    return Response.json(
      calls.length === 1
        ? { id: "e", status: "ACTIVE" }
        : { id: "c", status: "COMPLETED" },
    );
  };
  const a = new ReapSandboxAdapter(config, transport);
  await a.checkout("q", "e", "persisted-op");
  assert.equal(
    calls[0].url,
    "https://sg.sandbox.api.reap.global/agentic/enrollments/e",
  );
  const headers = calls[1].init!.headers as Record<string, string>;
  assert.equal(headers["Idempotency-Key"], "persisted-op");
  assert.equal(headers["Reap-Version"], "2025-02-14");
  assert.equal(headers["X-Simulate-Checkout"], "COMPLETED");
  assert.equal(headers.Authorization, "Bearer unit-test-placeholder");
  assert.throws(() => a.hostedUrl("https://evil.example"));
});
test("no credentials or unverified merchant fails closed", async () => {
  assert.throws(() => new ReapSandboxAdapter({ ...config, apiKey: "" }));
  const a = new ReapSandboxAdapter(config, async () => {
    throw new Error("must not fetch");
  });
  await assert.rejects(a.checkout("q", "e", "key"), /UNKNOWN/);
  assert.throws(() =>
    a.quote(
      {
        variantId: "v",
        merchantId: "not-allowed",
        email: "fixture@example.invalid",
        shippingAddress: {
          firstName: "Fixture",
          lastName: "Test",
          phone: "0",
          addressLine1: "Synthetic",
          city: "Fixture",
          postalCode: "00000",
          country: "MX",
        },
      },
      "key",
    ),
  );
});
