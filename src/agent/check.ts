import { loadAgentConfig } from "./config.ts";
try {
  const config = loadAgentConfig();
  console.log(
    `Configuración válida · modelo ${config.GEMINI_MODEL} · ${config.WHATSAPP_API_VERSION} · checkout ${config.AGENT_ALLOW_CHECKOUT === "true" ? "habilitado" : "deshabilitado"}. No se hicieron llamadas externas.`,
  );
} catch (e) {
  console.error(e instanceof Error ? e.message : "Configuración inválida.");
  process.exitCode = 1;
}
