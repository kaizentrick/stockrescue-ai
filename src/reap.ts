/** Server-only transport locked to the Reap Singapore sandbox. */
type PaymentConfig = {
  apiKey: string;
  mode: "payments";
  returnUrl: string;
  allowedMerchantIds: string[];
  hostedActionHosts: string[];
};
export type ReapConfig = { apiKey: string; mode?: "catalog" } | PaymentConfig;
const SANDBOX_ORIGIN = "https://sg.sandbox.api.reap.global";
const CATALOG_PATHS = new Set([
  "/agentic/products/search",
  "/agentic/products/details",
  "/agentic/products/variant",
]);
const PAYMENT_PATHS = {
  GET: /^\/agentic\/(enrollments|quotes|checkouts)\/[A-Za-z0-9_-]+$/,
  POST: /^\/agentic\/(enrollments|quotes|checkouts)$|^\/agentic\/quotes\/[A-Za-z0-9_-]+\/shipping-option$/,
};
export type ShippingAddress = {
  firstName: string;
  lastName: string;
  phone: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  country: string;
  region?: string;
};
export type ReapCheckout = {
  id: string;
  status: "REQUIRES_ACTION" | "PROCESSING" | "COMPLETED" | "FAILED" | "EXPIRED";
  quoteId?: string;
  enrollmentId?: string;
  orderId?: string;
  finalAmount?: { amount: number; currency: string };
  nextAction?: { type: "REDIRECT"; url: string; expiresAt?: string } | null;
};
export class ReapSandboxAdapter {
  #config: ReapConfig;
  #fetch: typeof fetch;
  static get base() {
    return SANDBOX_ORIGIN;
  }
  constructor(config: ReapConfig, transport: typeof fetch = fetch) {
    if (!config.apiKey)
      throw new Error(
        "Sandbox sin configurar: requiere credencial autorizada.",
      );
    if (config.mode && !["catalog", "payments"].includes(config.mode))
      throw new Error("Modo sandbox no permitido.");
    if (config.mode === "payments" && !config.allowedMerchantIds.length)
      throw new Error(
        "Sandbox sin configurar: requiere credencial autorizada y merchants verificados.",
      );
    if (
      config.mode === "payments" &&
      new URL(config.returnUrl).protocol !== "https:"
    )
      throw new Error("Reap requiere retorno HTTPS.");
    // Copy configuration so the caller cannot widen this instance's scope later.
    this.#config = structuredClone(config);
    this.#fetch = transport;
  }
  #paymentConfig(): PaymentConfig {
    if (this.#config.mode !== "payments")
      throw new Error("REAP_SCOPE_BLOCKED: el ejecutor solo permite catálogo.");
    return this.#config;
  }
  async request<T>(
    path: string,
    method: "GET" | "POST",
    body?: unknown,
    key?: string,
    simulate = false,
  ): Promise<T> {
    // Check raw paths before URL normalization, headers or transport. No absolute
    // URLs, queries, escaped paths, dot segments or alternate hosts are accepted.
    const catalog = method === "POST" && CATALOG_PATHS.has(path);
    const payment =
      this.#config.mode === "payments" &&
      (method === "GET" || method === "POST") &&
      PAYMENT_PATHS[method].test(path);
    if (
      (!catalog && !payment) ||
      (simulate &&
        !(payment && method === "POST" && path === "/agentic/checkouts"))
    )
      throw new Error("REAP_SCOPE_BLOCKED: método o ruta no permitidos.");
    const target = new URL(path, SANDBOX_ORIGIN);
    if (
      target.origin !== SANDBOX_ORIGIN ||
      target.pathname !== path ||
      target.search ||
      target.hash ||
      target.username ||
      target.password
    )
      throw new Error("REAP_DESTINATION_BLOCKED: destino no permitido.");
    if (method === "POST" && !key)
      throw new Error(
        "Persiste una Idempotency-Key por operación antes de enviar.",
      );
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.#config.apiKey}`,
      "Reap-Version": "2025-02-14",
      "Content-Type": "application/json",
    };
    if (key) headers["Idempotency-Key"] = key;
    if (simulate) headers["X-Simulate-Checkout"] = "COMPLETED";
    let response: Response;
    try {
      response = await this.#fetch(target.href, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(60000),
        redirect: "error",
      });
    } catch {
      throw new Error(
        "REAP_OUTCOME_UNKNOWN: conserva operación y reserva; no generes otra compra.",
      );
    }
    // Native fetch rejects redirects above. Also fail closed for injected
    // transports that return a redirect or an already-redirected response.
    if (
      response.redirected ||
      (response.status >= 300 && response.status < 400) ||
      (response.url && response.url !== target.href)
    )
      throw new Error(
        "REAP_REDIRECT_BLOCKED: respuesta fuera del destino autorizado.",
      );
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: { code?: string };
      };
      const code = payload.error?.code;
      throw new Error(
        `REAP_HTTP_${response.status}: ${typeof code === "string" && /^[A-Z0-9_]+$/.test(code) ? code : "REQUEST_FAILED"}`,
      );
    }
    return (await response.json()) as T;
  }
  enrollment(owner: { id: string; email: string }, key: string) {
    const config = this.#paymentConfig();
    return this.request<{
      id: string;
      status: string;
      nextAction?: { url: string };
    }>(
      "/agentic/enrollments",
      "POST",
      {
        source: "EXTERNAL",
        owner: { type: "CLIENT_REFERENCE", ...owner },
        presentation: { type: "REDIRECT", returnUrl: config.returnUrl },
      },
      key,
    );
  }
  getEnrollment(id: string) {
    return this.request<{
      id: string;
      status: string;
      nextAction?: { url: string } | null;
    }>(`/agentic/enrollments/${encodeURIComponent(id)}`, "GET");
  }
  search(query: string, key: string) {
    return this.request<unknown>(
      "/agentic/products/search",
      "POST",
      {
        query,
        context: { country: "MX", currency: "MXN" },
        filters: { availability: "AVAILABLE_ONLY" },
        pagination: { limit: 20 },
      },
      key,
    );
  }
  details(productIds: string[], key: string) {
    return this.request<unknown>(
      "/agentic/products/details",
      "POST",
      { productIds },
      key,
    );
  }
  variant(productId: string, optionIds: string[], key: string) {
    return this.request<unknown>(
      "/agentic/products/variant",
      "POST",
      { productId, optionIds },
      key,
    );
  }
  quote(
    input: {
      variantId: string;
      quantity?: number;
      merchantId: string;
      email: string;
      shippingAddress: ShippingAddress;
    },
    key: string,
  ) {
    if (!this.#paymentConfig().allowedMerchantIds.includes(input.merchantId))
      throw new Error("Merchant no admitido.");
    return this.request<unknown>(
      "/agentic/quotes",
      "POST",
      {
        items: [{ variantId: input.variantId, quantity: input.quantity ?? 1 }],
        email: input.email,
        shippingAddress: input.shippingAddress,
      },
      key,
    );
  }
  externalQuote(
    quantity: number,
    email: string,
    shippingAddress: ShippingAddress,
    key: string,
  ) {
    if (
      !this.#paymentConfig().allowedMerchantIds.includes("blendstation.com.mx")
    )
      throw new Error("Merchant no admitido.");
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100)
      throw new Error("Cantidad comercial inválida.");
    return this.request<unknown>(
      "/agentic/quotes",
      "POST",
      {
        externalCheckout: {
          merchantDomain: "blendstation.com.mx",
          checkoutUrl: `https://blendstation.com.mx/cart/47607777984690:${quantity}`,
        },
        email,
        shippingAddress,
      },
      key,
    );
  }
  getQuote(id: string) {
    return this.request<unknown>(
      `/agentic/quotes/${encodeURIComponent(id)}`,
      "GET",
    );
  }
  shipping(id: string, shippingOptionId: string, key: string) {
    return this.request<unknown>(
      `/agentic/quotes/${encodeURIComponent(id)}/shipping-option`,
      "POST",
      { shippingOptionId },
      key,
    );
  }
  async checkout(
    quoteId: string,
    enrollmentId: string,
    key: string,
  ): Promise<ReapCheckout> {
    const config = this.#paymentConfig();
    const enrollment = await this.getEnrollment(enrollmentId);
    if (enrollment.status !== "ACTIVE")
      throw new Error("Enrollment no ACTIVE.");
    return this.request<ReapCheckout>(
      "/agentic/checkouts",
      "POST",
      {
        quoteId,
        enrollmentId,
        presentation: { type: "REDIRECT", returnUrl: config.returnUrl },
      },
      key,
      true,
    );
  }
  getCheckout(id: string) {
    return this.request<ReapCheckout>(
      `/agentic/checkouts/${encodeURIComponent(id)}`,
      "GET",
    );
  }
  hostedUrl(url: string) {
    const config = this.#paymentConfig();
    const u = new URL(url);
    if (
      u.protocol !== "https:" ||
      !config.hostedActionHosts.includes(u.hostname)
    )
      throw new Error(`Destino alojado no verificado: ${u.hostname}.`);
    return u.toString();
  }
}

/** Capability-limited executor for the separately authorized catalog trial.
 * Construction never reads environment/files or makes a request. No enrollment,
 * quote, payment, generic request or hosted-navigation method is exposed.
 */
export function createCatalogSandboxExecutor(
  apiKey: string,
  transport: typeof fetch = fetch,
) {
  const adapter = new ReapSandboxAdapter(
    { apiKey, mode: "catalog" },
    transport,
  );
  return Object.freeze({
    search: (query: string, key: string) => adapter.search(query, key),
    details: (productIds: string[], key: string) =>
      adapter.details(productIds, key),
    variant: (productId: string, optionIds: string[], key: string) =>
      adapter.variant(productId, optionIds, key),
  });
}
