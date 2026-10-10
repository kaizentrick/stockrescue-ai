import { createServer, type IncomingMessage } from "node:http";
import { timingSafeEqual } from "node:crypto";
import type { AgentConfig } from "./config.ts";
import type { AgentStore } from "./store.ts";
import {
  inboundMessages,
  verifiedSignature,
  deliveryStatuses,
  canonicalPhone,
} from "./whatsapp.ts";

async function rawBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > 256 * 1024) throw new Error("BODY_TOO_LARGE");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}
export function createAgentServer(
  config: AgentConfig,
  store: AgentStore,
  now = Date.now,
) {
  const app = createServer({ maxHeaderSize: 8192 }, async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const send = (status: number, text: string) => {
      res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(text);
    };
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      if (url.pathname === "/health" && req.method === "GET") {
        send(200, "stockrescue-agent: ready");
        return;
      }
      if (url.pathname !== "/webhooks/whatsapp") {
        send(404, "Not found");
        return;
      }
      if (req.method === "GET") {
        const token = url.searchParams.get("hub.verify_token") ?? "";
        const expected = Buffer.from(config.WHATSAPP_VERIFY_TOKEN);
        const received = Buffer.from(token);
        const challenge = url.searchParams.get("hub.challenge");
        if (
          url.searchParams.get("hub.mode") !== "subscribe" ||
          expected.length !== received.length ||
          !timingSafeEqual(expected, received) ||
          !challenge ||
          challenge.length > 256
        ) {
          send(403, "Verification failed");
          return;
        }
        send(200, challenge);
        return;
      }
      if (req.method !== "POST") {
        send(405, "Method not allowed");
        return;
      }
      const body = await rawBody(req);
      const signature = req.headers["x-hub-signature-256"];
      if (
        !verifiedSignature(
          body,
          typeof signature === "string" ? signature : undefined,
          config.WHATSAPP_APP_SECRET,
        )
      ) {
        send(401, "Invalid signature");
        return;
      }
      const payload = JSON.parse(body.toString("utf8"));
      const messages = inboundMessages(
        payload,
        config.WHATSAPP_PHONE_NUMBER_ID,
      );
      for (const m of messages) {
        if (
          config.WHATSAPP_ALLOWED_SENDERS.includes(m.from) &&
          Number.isSafeInteger(m.timestamp) &&
          m.timestamp > 0 &&
          m.timestamp <= now() + 5 * 60 * 1000
        )
          store.enqueue(m);
      }
      for (const event of deliveryStatuses(
        payload,
        config.WHATSAPP_PHONE_NUMBER_ID,
      ))
        if (
          config.WHATSAPP_ALLOWED_SENDERS.includes(
            canonicalPhone(event.recipient_id),
          )
        )
          store.delivery(
            event.id,
            event.status,
            new Date(Number(event.timestamp) * 1000).toISOString(),
            event.errors?.map((e) => String(e.code)).join(","),
          );
      // Acknowledge only after durable storage; Gemini and Graph API run in the worker.
      send(200, "EVENT_RECEIVED");
    } catch (e) {
      send(
        e instanceof Error && e.message === "BODY_TOO_LARGE" ? 413 : 400,
        "Invalid webhook",
      );
    }
  });
  app.requestTimeout = 10000;
  app.headersTimeout = 10000;
  return app;
}
