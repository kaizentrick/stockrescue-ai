import { z } from "zod";

const secret = z.string().trim().min(1).regex(/^\S+$/);
const schema = z.object({
  GEMINI_API_KEY: secret,
  GEMINI_MODEL: z
    .string()
    .regex(/^gemini-[a-zA-Z0-9.-]+$/)
    .default("gemini-3.8-flash"),
  WHATSAPP_ACCESS_TOKEN: secret,
  WHATSAPP_PHONE_NUMBER_ID: z.string().regex(/^\d+$/),
  WHATSAPP_APP_SECRET: secret,
  WHATSAPP_VERIFY_TOKEN: secret.refine((v) => v.length >= 16),
  WHATSAPP_API_VERSION: z
    .string()
    .regex(/^v\d+\.\d+$/)
    .default("v25.0"),
  WHATSAPP_ALLOWED_SENDERS: z
    .string()
    .transform((v) => v.split(",").map((n) => n.trim()))
    .pipe(z.array(z.string().regex(/^[1-9]\d{6,14}$/)).min(1)),
  WHATSAPP_ALERT_TEMPLATE: z
    .string()
    .regex(/^[a-z0-9_]+$/)
    .default("stockrescue_low_stock"),
  WHATSAPP_TEMPLATE_LANGUAGE: z
    .string()
    .regex(/^[a-z]{2}(?:_[A-Z]{2})?$/)
    .default("es_MX"),
  AGENT_PORT: z.coerce.number().int().min(1).max(65535).default(4318),
  AGENT_DB: z
    .string()
    .min(1)
    .refine((v) => v !== ":memory:")
    .default(".data/stockrescue-agent.sqlite"),
  AGENT_ALLOW_CHECKOUT: z.enum(["true", "false"]).default("false"),
});
export type AgentConfig = z.infer<typeof schema>;
export function loadAgentConfig(
  env: NodeJS.ProcessEnv = process.env,
): AgentConfig {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => i.path[0]))];
    // Zod diagnostics can include values. Only field names may reach a log.
    throw new Error(
      `Configuración del agente incompleta o inválida: ${fields.join(", ")}.`,
    );
  }
  return parsed.data;
}
