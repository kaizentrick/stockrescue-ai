import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { AgentConfig } from "./config.ts";

export type InboundMessage = {
  id: string;
  from: string;
  text: string;
  timestamp: number;
};
const webhookSchema = z.object({
  object: z.literal("whatsapp_business_account"),
  entry: z
    .array(
      z.object({
        changes: z
          .array(
            z.object({
              field: z.string(),
              value: z.object({
                metadata: z.object({ phone_number_id: z.string() }).optional(),
                messages: z
                  .array(
                    z.object({
                      id: z.string().min(1).max(256),
                      from: z.string().regex(/^[1-9]\d{6,14}$/),
                      timestamp: z.string().regex(/^\d+$/),
                      type: z.string(),
                      text: z
                        .object({ body: z.string().min(1).max(4096) })
                        .optional(),
                    }),
                  )
                  .max(100)
                  .optional(),
              }),
            }),
          )
          .max(100),
      }),
    )
    .max(100),
});
export function verifiedSignature(
  body: Buffer,
  signature: string | undefined,
  secret: string,
) {
  if (!signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature.slice(7), "hex"));
}
export function inboundMessages(
  raw: unknown,
  phoneId: string,
): InboundMessage[] {
  return webhookSchema.parse(raw).entry.flatMap((entry) =>
    entry.changes.flatMap((change) => {
      if (
        change.field !== "messages" ||
        change.value.metadata?.phone_number_id !== phoneId
      )
        return [];
      return (change.value.messages ?? [])
        .filter((m) => m.type === "text" && m.text)
        .map((m) => ({
          id: m.id,
          from: m.from,
          text: m.text!.body,
          timestamp: Number(m.timestamp) * 1000,
        }));
    }),
  );
}
export interface WhatsAppSender {
  sendText(to: string, text: string): Promise<string>;
  sendAlert(to: string, parameters: string[]): Promise<string>;
}
export class WhatsAppClient implements WhatsAppSender {
  private config: AgentConfig;
  private transport: typeof fetch;
  constructor(config: AgentConfig, transport: typeof fetch = fetch) {
    this.config = config;
    this.transport = transport;
  }
  private async send(to: string, payload: object) {
    if (!this.config.WHATSAPP_ALLOWED_SENDERS.includes(to))
      throw new Error("WHATSAPP_RECIPIENT_NOT_ALLOWED");
    let response: Response;
    try {
      response = await this.transport(
        `https://graph.facebook.com/${this.config.WHATSAPP_API_VERSION}/${this.config.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(15000),
          headers: {
            Authorization: `Bearer ${this.config.WHATSAPP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            ...payload,
          }),
        },
      );
    } catch {
      throw new Error("WHATSAPP_OUTCOME_UNKNOWN");
    }
    if (!response.ok) throw new Error(`WHATSAPP_HTTP_${response.status}`);
    try {
      const raw: unknown = await response.json();
      return z
        .object({
          messages: z.array(z.object({ id: z.string().min(1) })).min(1),
        })
        .parse(raw).messages[0].id;
    } catch {
      throw new Error("WHATSAPP_OUTCOME_UNKNOWN");
    }
  }
  sendText(to: string, text: string) {
    return this.send(to, {
      type: "text",
      text: { preview_url: false, body: text.slice(0, 4096) },
    });
  }
  sendAlert(to: string, parameters: string[]) {
    if (parameters.length !== 4)
      throw new Error("WHATSAPP_TEMPLATE_PARAMETERS");
    return this.send(to, {
      type: "template",
      template: {
        name: this.config.WHATSAPP_ALERT_TEMPLATE,
        language: { code: this.config.WHATSAPP_TEMPLATE_LANGUAGE },
        components: [
          {
            type: "body",
            parameters: parameters.map((text) => ({ type: "text", text })),
          },
        ],
      },
    });
  }
}
