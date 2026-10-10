/** Server-only transport. Never imported by the local demo browser or server routes.
 * Activation requires a separately approved credential and verified merchant allowlist.
 * No cards, mandate endpoints or externalCheckout are accepted here.
 */
export type ReapConfig = {
  apiKey: string;
  returnUrl: string;
  allowedMerchantIds: string[];
  hostedActionHosts: string[];
};
export type ShippingAddress = {
  firstName: string;
  lastName: string;
  phone: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  country: string;
};
export type ReapCheckout = {
  id: string;
  status: "REQUIRES_ACTION" | "PROCESSING" | "COMPLETED" | "FAILED" | "EXPIRED";
  quoteId: string;
  enrollmentId: string;
  orderId?: string;
  finalAmount?: { amount: number; currency: string };
  nextAction?: { type: "REDIRECT"; url: string; expiresAt?: string } | null;
};
export class ReapSandboxAdapter {
  #config: ReapConfig;
  #fetch: typeof fetch;
  static readonly base = "https://sg.sandbox.api.reap.global";
  constructor(config: ReapConfig, transport: typeof fetch = fetch) {
    if (!config.apiKey || !config.allowedMerchantIds.length)
      throw new Error(
        "Sandbox sin configurar: requiere credencial autorizada y merchants verificados.",
      );
    if (new URL(config.returnUrl).protocol !== "https:")
      throw new Error("Reap requiere retorno HTTPS.");
    this.#config = config;
    this.#fetch = transport;
  }
  async request<T>(
    path: string,
    method: "GET" | "POST",
    body?: unknown,
    key?: string,
    simulate = false,
  ): Promise<T> {
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
      response = await this.#fetch(ReapSandboxAdapter.base + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15000),
        redirect: "error",
      });
    } catch {
      throw new Error(
        "REAP_OUTCOME_UNKNOWN: conserva operación y reserva; no generes otra compra.",
      );
    }
    if (!response.ok)
      throw new Error(
        `REAP_HTTP_${response.status}: consultar política de recuperación sin registrar cuerpos ni headers.`,
      );
    return (await response.json()) as T;
  }
  enrollment(owner: { id: string; email: string }, key: string) {
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
        presentation: { type: "REDIRECT", returnUrl: this.#config.returnUrl },
      },
      key,
    );
  }
  getEnrollment(id: string) {
    return this.request<{ id: string; status: string }>(
      `/agentic/enrollments/${encodeURIComponent(id)}`,
      "GET",
    );
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
      merchantId: string;
      email: string;
      shippingAddress: ShippingAddress;
    },
    key: string,
  ) {
    if (!this.#config.allowedMerchantIds.includes(input.merchantId))
      throw new Error("Merchant no admitido.");
    return this.request<unknown>(
      "/agentic/quotes",
      "POST",
      {
        items: [{ variantId: input.variantId, quantity: 1 }],
        email: input.email,
        shippingAddress: input.shippingAddress,
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
    const enrollment = await this.getEnrollment(enrollmentId);
    if (enrollment.status !== "ACTIVE")
      throw new Error("Enrollment no ACTIVE.");
    return this.request<ReapCheckout>(
      "/agentic/checkouts",
      "POST",
      {
        quoteId,
        enrollmentId,
        presentation: { type: "REDIRECT", returnUrl: this.#config.returnUrl },
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
    const u = new URL(url);
    if (
      u.protocol !== "https:" ||
      !this.#config.hostedActionHosts.includes(u.hostname)
    )
      throw new Error("Destino alojado no verificado.");
    return u.toString();
  }
}
