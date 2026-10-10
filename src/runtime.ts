import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Store } from "./store.ts";
import { Service } from "./service.ts";
import { SandboxProvider } from "./provider.ts";
import { ReapSandboxAdapter } from "./reap.ts";

/** Shared by the SaaS and its WhatsApp gateway; never exposes the SaaS HTTP API. */
export function createRuntimeService(env: NodeJS.ProcessEnv = process.env) {
  const mode = env.PAYMENTS_MODE ?? "mock";
  if (!["mock", "sandbox"].includes(mode))
    throw new Error(
      "Solo se permiten práctica local y sandbox. Producción está bloqueada.",
    );
  const provider =
    mode === "sandbox"
      ? new SandboxProvider(
          new ReapSandboxAdapter({
            apiKey: env.REAP_API_KEY ?? "",
            mode: "payments",
            returnUrl: env.REAP_RETURN_URL ?? "",
            allowedMerchantIds: ["blendstation.com.mx"],
            hostedActionHosts: (
              env.REAP_HOSTED_HOSTS ?? "sandbox.collect.prava.space"
            ).split(","),
          }),
        )
      : undefined;
  const path = env.STOCKRESCUE_DB ?? `.data/stockrescue-${mode}.sqlite`;
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  return new Service(new Store(path), provider);
}
