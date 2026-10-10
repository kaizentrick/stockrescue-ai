import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// The vault selector is public configuration. The credential travels only
// through a captured pipe and the child environment, never argv or a file.
const item = process.env.REAP_VAULT_ITEM ?? "StockRescue Reap sandbox";
let credential: string;
try {
  credential = execFileSync(
    "op",
    ["item", "get", item, "--fields", "credential", "--reveal"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 60_000 },
  ).trim();
  if (!credential || /\s/.test(credential))
    throw new Error("Invalid credential");
} catch {
  console.error(
    "No se pudo leer la credencial. Desbloquea 1Password y revisa REAP_VAULT_ITEM y su campo credential.",
  );
  process.exit(1);
}
const child = spawn(
  process.execPath,
  [
    fileURLToPath(
      new URL(
        process.argv.includes("--agent") ? "./agent/start.ts" : "./server.ts",
        import.meta.url,
      ),
    ),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PAYMENTS_MODE: "sandbox",
      REAP_API_KEY: credential,
      REAP_RETURN_URL:
        process.env.REAP_RETURN_URL ??
        "https://docs.reap.global/agentic-payments/setup",
      REAP_HOSTED_HOSTS: "sandbox.collect.prava.space",
    },
  },
);
credential = "";
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", () => {
  console.error("No se pudo iniciar StockRescue.");
  process.exit(1);
});
