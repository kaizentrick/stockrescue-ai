import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { AgentConfig } from "./config.ts";

// Meta can report the legacy mobile prefix for the same Mexican number.
export const canonicalPhone = (phone: string) =>
  /^521\d{10}$/.test(phone) ? "52" + phone.slice(3) : phone;
export type InboundMessage = {
  id: string;
  from: string;
  text: string;
  timestamp: number;
  media?: { id: string; mime: string };
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
                      image: z
                        .object({ id: z.string(), mime_type: z.string() })
                        .optional(),
                      document: z
                        .object({ id: z.string(), mime_type: z.string() })
                        .optional(),
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
        .filter(
          (m) =>
            (m.type === "text" && m.text) ||
            (m.type === "image" && m.image) ||
            (m.type === "document" && m.document),
        )
        .map((m) => ({
          id: m.id,
          from: canonicalPhone(m.from),
          text: m.text?.body ?? "Documento recibido",
          ...((m.image ?? m.document)
            ? {
                media: {
                  id: (m.image ?? m.document)!.id,
                  mime: (m.image ?? m.document)!.mime_type,
                },
              }
            : {}),
          timestamp: Number(m.timestamp) * 1000,
        }));
    }),
  );
}
export interface WhatsAppSender {
  sendText(to: string, text: string): Promise<string>;
  downloadMedia?(id: string): Promise<{ bytes: Buffer; mime: string }>;
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
    if (!response.ok) {
      const failure = await response.json().catch(() => ({}));
      const code = Number.isSafeInteger(failure.error?.code)
        ? "_CODE_" + failure.error.code
        : "";
      throw new Error(`WHATSAPP_HTTP_${response.status}${code}`);
    }
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
  async downloadMedia(id: string) {
    if (!/^\d+$/.test(id)) throw new Error("MEDIA_ID_INVALID");
    const headers = {
      Authorization: `Bearer ${this.config.WHATSAPP_ACCESS_TOKEN}`,
    };
    const r = await this.transport(
      `https://graph.facebook.com/${this.config.WHATSAPP_API_VERSION}/${id}`,
      { headers, redirect: "error", signal: AbortSignal.timeout(15000) },
    );
    if (!r.ok) throw new Error("MEDIA_METADATA_UNAVAILABLE");
    const data = z
      .object({
        url: z.url(),
        mime_type: z.string(),
        file_size: z.number().optional(),
      })
      .parse(await r.json());
    const url = new URL(data.url);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !(
        url.hostname === "lookaside.fbsbx.com" ||
        url.hostname.endsWith(".fbcdn.net")
      ) ||
      !["image/jpeg", "image/png", "application/pdf"].includes(
        data.mime_type,
      ) ||
      (data.file_size ?? 0) > 8 * 1024 * 1024
    )
      throw new Error("MEDIA_NOT_SUPPORTED");
    const content = await this.transport(url, {
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    });
    if (!content.ok || !content.body) throw new Error("MEDIA_DOWNLOAD_FAILED");
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const c of content.body as unknown as AsyncIterable<Uint8Array>) {
      size += c.length;
      if (size > 8 * 1024 * 1024) throw new Error("MEDIA_TOO_LARGE");
      chunks.push(Buffer.from(c));
    }
    return { bytes: Buffer.concat(chunks), mime: data.mime_type };
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

export function deliveryStatuses(raw: unknown, phoneId: string) {
  const parsed = z
    .object({
      entry: z.array(
        z.object({
          changes: z.array(
            z.object({
              field: z.string(),
              value: z.object({
                metadata: z.object({ phone_number_id: z.string() }).optional(),
                statuses: z
                  .array(
                    z.object({
                      id: z.string().max(256),
                      status: z.enum(["sent", "delivered", "read", "failed"]),
                      timestamp: z.string().regex(/^\d+$/),
                      recipient_id: z.string(),
                      errors: z
                        .array(z.object({ code: z.number() }))
                        .optional(),
                    }),
                  )
                  .optional(),
              }),
            }),
          ),
        }),
      ),
    })
    .parse(raw);
  return parsed.entry.flatMap((e) =>
    e.changes
      .filter(
        (c) =>
          c.field === "messages" &&
          c.value.metadata?.phone_number_id === phoneId,
      )
      .flatMap((c) => c.value.statuses ?? []),
  );
}
