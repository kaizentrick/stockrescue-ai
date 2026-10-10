import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ReapSandboxAdapter,
  createCatalogSandboxExecutor,
} from "../src/reap.ts";
const config = {
  mode: "payments" as const,
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

test("catalog executor exposes only three product operations on the fixed sandbox host", async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const executor = createCatalogSandboxExecutor(
    "unit-test-placeholder",
    async (input, init) => {
      calls.push({ url: String(input), init });
      return Response.json({ fixture: true });
    },
  );
  assert.deepEqual(Object.keys(executor).sort(), [
    "details",
    "search",
    "variant",
  ]);
  assert.ok(Object.isFrozen(executor));
  assert.equal(calls.length, 0);
  await executor.search("USB-C HDMI adapter", "persisted-search");
  await executor.details(["product-fixture"], "persisted-details");
  await executor.variant(
    "product-fixture",
    ["option-fixture"],
    "persisted-variant",
  );
  assert.deepEqual(
    calls.map((c) => c.url),
    ["search", "details", "variant"].map(
      (operation) =>
        `https://sg.sandbox.api.reap.global/agentic/products/${operation}`,
    ),
  );
  for (const call of calls) {
    assert.equal(call.init?.method, "POST");
    assert.equal(call.init?.redirect, "error");
    assert.ok(call.init?.signal);
    const headers = call.init?.headers as Record<string, string>;
    assert.equal(headers["Reap-Version"], "2025-02-14");
    assert.equal(headers["X-Simulate-Checkout"], undefined);
    assert.match(headers["Idempotency-Key"], /^persisted-/);
  }
});

test("catalog rejects every non-catalog method or route before transport", async () => {
  let calls = 0;
  const adapter = new ReapSandboxAdapter(
    { apiKey: "unit-test-placeholder" },
    async () => {
      calls++;
      return Response.json({});
    },
  );
  for (const method of [
    "GET",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
    "post",
  ]) {
    await assert.rejects(
      adapter.request("/agentic/products/search", method as "POST", {}, "key"),
      /SCOPE_BLOCKED/,
    );
  }
  for (const path of [
    "/agentic/enrollments",
    "/agentic/enrollments/id",
    "/agentic/quotes",
    "/agentic/quotes/id",
    "/agentic/quotes/id/shipping-option",
    "/agentic/checkouts",
    "/agentic/checkouts/id",
    "/agentic/mandates",
    "/agentic/externalCheckout",
    "/agentic/products/search/",
    "/agentic/products/search?next=/agentic/checkouts",
    "/agentic/products/search#fragment",
    "/agentic/products/%73earch",
    "/agentic/products/../checkouts",
    "/agentic/products/search/../../checkouts",
    "/agentic/products/SEARCH",
    "/agentic/products/search\n",
    " /agentic/products/search",
  ]) {
    await assert.rejects(
      adapter.request(path, "POST", {}, "key"),
      /SCOPE_BLOCKED/,
    );
  }
  await assert.rejects(
    adapter.request("/agentic/products/search", "POST", {}, "key", true),
    /SCOPE_BLOCKED/,
  );
  await assert.rejects(adapter.search("fixture", ""), /Idempotency-Key/);
  await assert.rejects(adapter.checkout("q", "e", "key"), /SCOPE_BLOCKED/);
  assert.throws(
    () =>
      adapter.enrollment(
        { id: "fixture", email: "fixture@example.invalid" },
        "key",
      ),
    /SCOPE_BLOCKED/,
  );
  assert.equal(calls, 0);
});

test("catalog rejects absolute URLs, host overrides, credentials, ports and protocol-relative targets", async () => {
  let calls = 0;
  const adapter = new ReapSandboxAdapter(
    { apiKey: "unit-test-placeholder" },
    async () => {
      calls++;
      return Response.json({});
    },
  );
  for (const path of [
    "https://api.reap.global/agentic/products/search",
    "https://sg.sandbox.api.reap.global/agentic/products/search",
    "http://sg.sandbox.api.reap.global/agentic/products/search",
    "//evil.example/agentic/products/search",
    "https://sg.sandbox.api.reap.global.evil.example/agentic/products/search",
    "https://sg.sandbox.api.reap.global@evil.example/agentic/products/search",
    "https://sg.sandbox.api.reap.global:444/agentic/products/search",
    "\\\\evil.example\\agentic\\products\\search",
  ]) {
    await assert.rejects(
      adapter.request(path, "POST", {}, "key"),
      /SCOPE_BLOCKED/,
    );
  }
  assert.equal(calls, 0);
});

test("sandbox rejects redirects and transport responses from a different URL without following them", async () => {
  for (const status of [301, 302, 303, 307, 308]) {
    for (const location of [
      "https://evil.example/",
      "https://sg.sandbox.api.reap.global/agentic/checkouts",
    ]) {
      let calls = 0;
      const executor = createCatalogSandboxExecutor(
        "unit-test-placeholder",
        async (_input, init) => {
          calls++;
          assert.equal(init?.redirect, "error");
          return Response.redirect(location, status);
        },
      );
      await assert.rejects(
        executor.search("fixture", "key"),
        /REDIRECT_BLOCKED/,
      );
      assert.equal(calls, 1);
    }
  }
  for (const properties of [
    { redirected: true },
    { url: "https://evil.example/agentic/products/search" },
    { url: "https://sg.sandbox.api.reap.global/agentic/checkouts" },
  ]) {
    const response = Response.json({});
    for (const [key, value] of Object.entries(properties))
      Object.defineProperty(response, key, { value });
    const executor = createCatalogSandboxExecutor(
      "unit-test-placeholder",
      async () => response,
    );
    await assert.rejects(executor.search("fixture", "key"), /REDIRECT_BLOCKED/);
  }
  const executor = createCatalogSandboxExecutor(
    "unit-test-placeholder",
    async () => {
      throw new TypeError(
        "fetch failed: unit-test-placeholder must not appear in error",
      );
    },
  );
  await assert.rejects(executor.search("fixture", "key"), (error: Error) => {
    assert.match(error.message, /OUTCOME_UNKNOWN/);
    assert.doesNotMatch(error.message, /unit-test-placeholder/);
    return true;
  });
});

test("catalog scope cannot widen through caller mutation; payments scope also rejects undeclared endpoints", async () => {
  let calls = 0;
  const mutableConfig = { apiKey: "unit-test-placeholder" };
  const transport: typeof fetch = async () => {
    calls++;
    return Response.json({});
  };
  const catalog = new ReapSandboxAdapter(mutableConfig, transport);
  Object.assign(mutableConfig, config);
  await assert.rejects(
    catalog.request("/agentic/quotes", "POST", {}, "key"),
    /SCOPE_BLOCKED/,
  );
  const payments = new ReapSandboxAdapter(config, transport);
  await assert.rejects(
    payments.request("/agentic/mandates", "POST", {}, "key"),
    /SCOPE_BLOCKED/,
  );
  await assert.rejects(
    payments.request("/agentic/enrollments/../quotes", "GET"),
    /SCOPE_BLOCKED/,
  );
  assert.equal(calls, 0);
});
